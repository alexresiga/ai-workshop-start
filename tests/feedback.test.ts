// spec/feedback.md: feedback.sh ready rebases a PR on the latest main and labels it "ready to merge", with a real git
// against a local remote, and a gh and an npm that only log and answer from files.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const FEEDBACK = fileURLToPath(new URL('../.agents/skills/address-review/feedback.sh', import.meta.url));
const PR = '9';
const BRANCH = 'issue-7-rename';
const NOTE = '\n\n<!-- agent: note -->';

// gh answers `api --paginate <endpoint>` from <endpoint>.json (or []) and `pr view` from pr.json, through its --jq,
// as gh does; every call goes to `calls`, one line each, its arguments in brackets.
const GH = `#!/bin/sh
d=$(dirname "$0")
for a; do printf '[%s] ' "$a"; done >> "$d/calls"; echo >> "$d/calls"
q=; prev=
for a; do [ "$prev" = --jq ] && q=$a; prev=$a; done
case "$1 $2" in
  "api --paginate") f="$d/$(echo "$3" | sed 's#^repos/alexresiga/ai-workshop-start/##; s#/#_#g').json"
    [ -f "$f" ] || f="$d/empty.json"; jq -rc "$q" "$f" ;;
  "pr view") jq -r "$q" "$d/pr.json" ;;
  "api -X") echo https://github.com/alexresiga/ai-workshop-start/pull/9#issuecomment-1 ;;
esac
`;
// npm runs FAKE_NPM_RUN first, if set: what happens elsewhere while the tests run.
const NPM = '#!/bin/sh\necho "npm $*" >> "$(dirname "$0")/calls"\n[ -z "$FAKE_NPM_RUN" ] || sh -c "$FAKE_NPM_RUN"\nexit "${FAKE_NPM_EXIT:-0}"\n';

type Main = 'still' | 'moved' | 'conflicts';

/** A PR branch, `issue-7-rename`, off main and pushed; main then still, moved on apart, or moved on in the same file. */
function repository(t: TestContext, main: Main, comments: object[] = []) {
  const root = mkdtempSync(join(tmpdir(), 'feedback-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const bin = join(root, 'bin');
  const work = join(root, 'work');
  const remote = join(root, 'remote.git');
  execFileSync('mkdir', [bin, work]);
  writeFileSync(join(bin, 'gh'), GH);
  writeFileSync(join(bin, 'npm'), NPM);
  chmodSync(join(bin, 'gh'), 0o755);
  chmodSync(join(bin, 'npm'), 0o755);
  writeFileSync(join(bin, 'empty.json'), '[]');
  writeFileSync(join(bin, 'pr.json'), JSON.stringify({ headRefName: BRANCH, closingIssuesReferences: [{ number: 7 }] }));
  writeFileSync(join(bin, `issues_${PR}_comments.json`), JSON.stringify(comments));
  const env = {
    ...process.env, PATH: `${bin}:${process.env.PATH}`, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com',
  };
  const git = (...args: string[]) => execFileSync('git', args, { cwd: work, env, encoding: 'utf8' }).trim();
  const commit = (file: string, text: string) => { writeFileSync(join(work, file), text); git('add', file); git('commit', '-qm', file); };
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote], { env });
  git('init', '-q', '-b', 'main');
  git('remote', 'add', 'origin', remote);
  commit('README.md', 'one\n');
  git('push', '-q', 'origin', 'main');
  git('switch', '-qc', BRANCH);
  commit('name.txt', 'the new name\n');
  git('push', '-q', '-u', 'origin', BRANCH);
  if (main !== 'still') {
    git('switch', '-q', 'main');
    commit(main === 'moved' ? 'other.txt' : 'name.txt', 'from main\n');
    git('push', '-q', 'origin', 'main');
    git('switch', '-q', BRANCH);
  }
  const ready = (extra: Record<string, string> = {}) => {
    const run = spawnSync('bash', [FEEDBACK, 'ready', PR], { cwd: work, env: { ...env, ...extra }, encoding: 'utf8' });
    const path = join(bin, 'calls');
    return { ...run, calls: existsSync(path) ? readFileSync(path, 'utf8').trim().split('\n').map((call) => call.trimEnd()) : [] };
  };
  const pushed = () => execFileSync('git', ['rev-parse', BRANCH], { cwd: remote, encoding: 'utf8' }).trim();
  /** Another run's clone of the PR branch, with a fix committed and not yet pushed. */
  const elsewhere = () => {
    const other = join(root, 'other');
    execFileSync('git', ['clone', '-q', '-b', BRANCH, remote, other], { env });
    writeFileSync(join(other, 'fix.txt'), 'the fix\n');
    execFileSync('git', ['add', 'fix.txt'], { cwd: other, env });
    execFileSync('git', ['commit', '-qm', 'fix'], { cwd: other, env });
    return { other, fix: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: other, encoding: 'utf8' }).trim() };
  };
  return { git, work, ready, pushed, elsewhere, before: git('rev-parse', 'HEAD') };
}

const labelled = (calls: string[], how: 'add' | 'remove') => [PR, '7'].every((n) => calls.includes(how === 'add'
  ? `[api] [-X] [POST] [repos/alexresiga/ai-workshop-start/issues/${n}/labels] [-f] [labels[]=ready to merge]`
  : `[api] [-X] [DELETE] [repos/alexresiga/ai-workshop-start/issues/${n}/labels/ready%20to%20merge]`));
const posted = (calls: string[]) => calls.filter((call) => call.match(/^\[api\] \[-X\] \[POST\] \[[^\]]*\/comments\]/));
const npm = (calls: string[]) => calls.filter((call) => call.startsWith('npm '));

test('not ready: feedback still pending → not ready: <n> pending, exit 1, the label taken off, nothing rebased or pushed', (t) => {
  const repo = repository(t, 'moved', [{ id: 1, user: { login: 'alice' }, body: 'Rename it again', html_url: 'u' }]);
  const run = repo.ready();
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /not ready: 1 pending/);
  assert.ok(labelled(run.calls, 'remove'), run.calls.join('\n'));
  assert.equal(repo.git('rev-parse', 'HEAD'), repo.before);
  assert.equal(repo.pushed(), repo.before);
});

test('not ready: an answered comment is not pending', (t) => {
  const repo = repository(t, 'still', [
    { id: 1, user: { login: 'alice' }, body: 'Rename it again', html_url: 'u' },
    { id: 2, user: { login: 'bot' }, body: 'Done. <!-- agent: issue-1 -->', html_url: 'v' },
  ]);
  const run = repo.ready();
  assert.equal(run.status, 0, run.stderr);
  assert.ok(labelled(run.calls, 'add'));
});

test('not ready: the PR branch not checked out → check out <branch> first, exit 2, nothing labelled or pushed', (t) => {
  const repo = repository(t, 'moved');
  repo.git('switch', '-q', 'main');
  const run = repo.ready();
  assert.equal(run.status, 2);
  assert.match(run.stderr, new RegExp(`check out ${BRANCH} first`));
  assert.ok(!labelled(run.calls, 'add'));
  assert.equal(repo.pushed(), repo.before);
});

test('not ready: uncommitted changes → commit them first, exit 2, nothing labelled or pushed', (t) => {
  const repo = repository(t, 'moved');
  writeFileSync(join(repo.work, 'name.txt'), 'half done\n');
  const run = repo.ready();
  assert.equal(run.status, 2);
  assert.match(run.stderr, /uncommitted changes: commit them first/);
  assert.ok(!labelled(run.calls, 'add'));
  assert.equal(repo.pushed(), repo.before);
});

test('not ready: another run pushed to the branch, even once fetched → <branch> is not at origin/<branch>: pull first, exit 2, its push stands', (t) => {
  const repo = repository(t, 'moved');
  const { other, fix } = repo.elsewhere();
  execFileSync('git', ['push', '-q', 'origin', BRANCH], { cwd: other });
  repo.git('fetch', '-q');
  const run = repo.ready();
  assert.equal(run.status, 2, run.stderr);
  assert.match(run.stderr, new RegExp(`${BRANCH} is not at origin/${BRANCH}: pull first`));
  assert.ok(!labelled(run.calls, 'add'));
  assert.deepEqual(npm(run.calls), []);
  assert.equal(repo.pushed(), fix);
  assert.equal(repo.git('rev-parse', 'HEAD'), repo.before);
});

test('not ready: origin/<branch> moves while it rebases → the push refused, the branch back, the label off, exit 1, its push stands', (t) => {
  const repo = repository(t, 'moved');
  const { other, fix } = repo.elsewhere();
  const run = repo.ready({ FAKE_NPM_RUN: `git -C '${other}' push -q origin ${BRANCH}` });
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, new RegExp(`not ready: origin/${BRANCH} moved while rebasing: pull first`));
  assert.equal(repo.pushed(), fix);
  assert.equal(repo.git('rev-parse', 'HEAD'), repo.before);
  assert.ok(labelled(run.calls, 'remove'));
  assert.ok(!labelled(run.calls, 'add'));
});

test('not ready: rebasing conflicts → aborted, the branch as it was, the label off, a note on the PR, exit 1, nothing pushed', (t) => {
  const repo = repository(t, 'conflicts');
  const run = repo.ready();
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /not ready: rebasing on main conflicts in name\.txt/);
  assert.equal(repo.git('rev-parse', 'HEAD'), repo.before);
  assert.equal(repo.git('status', '--porcelain'), '');
  assert.ok(!existsSync(join(repo.work, '.git', 'rebase-merge')));
  assert.ok(labelled(run.calls, 'remove'));
  assert.ok(!labelled(run.calls, 'add'));
  assert.equal(posted(run.calls).length, 1);
  assert.match(posted(run.calls)[0], /\[body=Not ready to merge: rebasing on main conflicts in name\.txt\. The branch is left as it was\./);
  assert.deepEqual(npm(run.calls), []);
  assert.equal(repo.pushed(), repo.before);
});

test('not ready: the same note is posted once: a PR that already has it gets no other', (t) => {
  const body = 'Not ready to merge: rebasing on main conflicts in name.txt. The branch is left as it was.' + NOTE;
  const repo = repository(t, 'conflicts', [{ id: 3, user: { login: 'bot' }, body, html_url: 'w' }]);
  const run = repo.ready();
  assert.equal(run.status, 1, run.stderr);
  assert.deepEqual(posted(run.calls), []);
});

test('not ready: rebased, but the tests fail → the branch back where it was, the label off, a note, exit 1, nothing pushed', (t) => {
  const repo = repository(t, 'moved');
  const run = repo.ready({ FAKE_NPM_EXIT: '1' });
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stderr, /not ready: rebased on main, the tests or the typecheck fail/);
  assert.equal(repo.git('rev-parse', 'HEAD'), repo.before);
  assert.ok(labelled(run.calls, 'remove'));
  assert.ok(!labelled(run.calls, 'add'));
  assert.match(posted(run.calls)[0] ?? '', /\[body=Not ready to merge: rebased on main, the tests or the typecheck fail\./);
  assert.equal(repo.pushed(), repo.before);
});

test('ready: rebased on the latest main, the tests and the typecheck pass, pushed, then the PR and its issue labelled', (t) => {
  const repo = repository(t, 'moved');
  const run = repo.ready();
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, `ready to merge: #${PR} #7\n`);
  assert.equal(repo.git('rev-parse', 'HEAD~1'), repo.git('rev-parse', 'origin/main'));
  assert.notEqual(repo.git('rev-parse', 'HEAD'), repo.before);
  assert.equal(repo.pushed(), repo.git('rev-parse', 'HEAD'));
  assert.deepEqual(npm(run.calls), ['npm test', 'npm run typecheck']);
  assert.ok(labelled(run.calls, 'add'));
  assert.deepEqual(posted(run.calls), []);
});

test('ready: already on the latest main → no tests run, nothing new pushed, labelled', (t) => {
  const repo = repository(t, 'still');
  const run = repo.ready();
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, `ready to merge: #${PR} #7\n`);
  assert.deepEqual(npm(run.calls), []);
  assert.equal(repo.pushed(), repo.before);
  assert.ok(labelled(run.calls, 'add'));
});
