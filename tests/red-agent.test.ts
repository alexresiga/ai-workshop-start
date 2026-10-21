// spec/red-agent.md: a bug's steps recorded against the fixture, twice, and filed as one issue with its video.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { actual } from '../.agents/skills/red-agent/repro.ts';

const REPRO = fileURLToPath(new URL('../.agents/skills/red-agent/repro.ts', import.meta.url));
const FILE = fileURLToPath(new URL('../.agents/skills/red-agent/file.sh', import.meta.url));
const REPOSITORY = fileURLToPath(new URL('..', import.meta.url));
const tools = spawnSync('ffprobe', ['-version']).status === 0 && existsSync(join(REPOSITORY, 'node_modules/@playwright/test'));
const browser = tools && (await import('@playwright/test')).chromium.launch().then((b) => (b.close(), true), () => false);
const reproTest = (await browser) ? test : test.skip;

type T = { after(fn: () => void): void };

/** A new bug directory in test-results/, named `slug`. */
function bugDir(t: T, slug = 'esc-filter') {
  mkdirSync(join(REPOSITORY, 'test-results'), { recursive: true });
  const dir = join(mkdtempSync(join(REPOSITORY, 'test-results', 'red-')), slug);
  mkdirSync(dir);
  t.after(() => rmSync(join(dir, '..'), { recursive: true, force: true }));
  return dir;
}

const TYPE = "await act.type(page.getByLabel('Filter skills'), 'messages');";
const HEAD = "export const title = 'The pill says 9 of 9';\nexport const expected = 'spec/web.md: the pill shows `N of M skills`';\n";

/** A steps file: `first`, typing in the filter by default, then `last`, the step that shows the bug; recorded. */
function repro(t: T, last: string, { first = TYPE, head = HEAD } = {}) {
  const dir = bugDir(t);
  writeFileSync(join(dir, 'steps.ts'), `import { expect } from '@playwright/test';\n${head}let runs = 0;\nexport const steps = [
  { caption: 'Type "messages" in the filter', async run(page, act) { runs++; ${first} } },
  { caption: 'The pill shows the count', async run(page) { ${last} } },
];\n`);
  const run = spawnSync('node', [REPRO, join(dir, 'steps.ts')], { cwd: REPOSITORY, encoding: 'utf8', timeout: 240_000 });
  return { ...run, dir, out: join(dir, 'out') };
}

const WRONG = "await expect(page.locator('#count')).toHaveText('9 of 9 skills', { timeout: 1000 });";
const RIGHT = "await expect(page.locator('#count')).toHaveText('1 of 3 skills');";

reproTest('the steps: both runs fail at the last step → the bug, exit 0: the video, the preview, the trace and the issue', (t) => {
  const run = repro(t, WRONG);
  assert.equal(run.status, 0, run.stderr);
  for (const name of ['repro.mp4', 'preview.gif', 'captions.vtt', 'trace.zip', 'steps.ts', 'repro.json', 'issue.md']) assert.ok(existsSync(join(run.out, name)), name);
  assert.ok(!existsSync(join(run.out, 'trace-2.zip')));

  const probe = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_chapters', '-of', 'json', join(run.out, 'repro.mp4')], { encoding: 'utf8' }).stdout);
  const video = probe.streams.find((stream: { codec_type: string }) => stream.codec_type === 'video');
  assert.deepEqual([video.codec_name, video.width, video.height], ['h264', 1280, 720]);
  assert.ok(probe.streams.some((stream: { codec_type: string }) => stream.codec_type === 'subtitle'));
  assert.deepEqual(probe.chapters.map((chapter: { tags: { title: string } }) => chapter.tags.title), ['Type "messages" in the filter', '✗ The pill shows the count']);

  const result = JSON.parse(readFileSync(join(run.out, 'repro.json'), 'utf8'));
  assert.equal(result.title, 'The pill says 9 of 9');
  assert.equal(result.expected, 'spec/web.md: the pill shows `N of M skills`');
  assert.match(result.head, /^[0-9a-f]{40}$/);
  assert.deepEqual([result.failed.step, result.failed.caption], [2, 'The pill shows the count']);
  assert.deepEqual(result.checks.filter((check: { ok: boolean }) => !check.ok), []);

  const issue = readFileSync(join(run.out, 'issue.md'), 'utf8');
  assert.match(issue, /\{\{media\}\}\/repro\.mp4/);
  assert.match(issue, /\{\{media\}\}\/steps\.ts/);
  assert.match(issue, /1\. `\.\/skill-atlas serve`, open `\?repo=example\/fixture`\n2\. Type "messages" in the filter\n3\. The pill shows the count\n/);
  assert.match(issue, /## Expected\n\nspec\/web\.md: the pill shows `N of M skills`\n/);
  assert.match(issue, /## Actual\n\n```\n[^`]*Expected: "9 of 9 skills"\nReceived: "1 of 3 skills"/);
  assert.doesNotMatch(issue, /\x1b|Call log/);
  assert.match(issue, /recordings\/bugs\/esc-filter\/steps\.ts/);
});

reproTest('the steps: every step passes → no bug to report, exit 1, no video', (t) => {
  const run = repro(t, RIGHT);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /every step passes: no bug to report/);
  assert.ok(!existsSync(run.out));
});

reproTest('the steps: an earlier step fails → step <n> fails, not the last, and its error, exit 1, no video', (t) => {
  const run = repro(t, RIGHT, { first: "await expect(page.locator('#count')).toHaveText('0 skills', { timeout: 1000 });" });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /step 1 fails, not the last: fix the steps/);
  assert.match(run.stderr, /0 skills/);
  assert.ok(!existsSync(run.out));
});

reproTest('the steps: only one run fails → it fails in only 1 of 2 runs, exit 1, no video', (t) => {
  const run = repro(t, `if (runs === 1) ${WRONG} else ${RIGHT}`);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /it fails in only 1 of 2 runs/);
  assert.ok(!existsSync(run.out));
});

test('the steps: a missing title, expected or steps → <file> exports no <name>, exit 1, no video', (t) => {
  const dir = bugDir(t);
  writeFileSync(join(dir, 'steps.ts'), "export const title = '  ';\nexport const steps = [];\n");
  // An earlier run's recording, of other steps: not left for file.sh to file.
  mkdirSync(join(dir, 'out'));
  writeFileSync(join(dir, 'out/repro.json'), '{}');
  const run = spawnSync('node', [REPRO, join(dir, 'steps.ts')], { cwd: REPOSITORY, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /steps\.ts exports no title, no expected, no steps\n$/);
  assert.ok(!existsSync(join(dir, 'out')));
});

test('the steps: no steps file → a clear message, exit 2', () => {
  const run = spawnSync('node', [REPRO, 'no/such/steps.ts'], { cwd: REPOSITORY, encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.equal(run.stderr, 'no steps file: no/such/steps.ts\n');
});

test('actual: the error with no colours and no call log, at most 12 lines', () => {
  const error = 'step 2, "The pill": \x1b[2mexpect(\x1b[22m\x1b[31mlocator\x1b[39m).toHaveText()\n\nExpected: "9"\nReceived: "1"\n\nCall log:\n  - waiting for #count';
  assert.equal(actual(error), 'expect(locator).toHaveText()\n\nExpected: "9"\nReceived: "1"');
  assert.equal(actual(Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n')).split('\n').length, 12);
});

// Filing: with a gh that answers the issue search from FAKE_ISSUES, and --dry-run, so nothing is pushed or filed.
function recorded(t: T, checks: { name: string; ok: boolean; detail: string }[], title = 'The pill says 9 of 9') {
  const dir = bugDir(t, 'pill-count');
  mkdirSync(join(dir, 'out'));
  writeFileSync(join(dir, 'out/repro.json'), JSON.stringify({ title, head: 'abc123', checks }));
  writeFileSync(join(dir, 'out/issue.md'), '![preview]({{media}}/preview.gif)\n[Video]({{media}}/repro.mp4)\n');
  writeFileSync(join(dir, 'out/repro.mp4'), '');
  const bin = join(dir, '..', 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'gh'), '#!/bin/sh\necho "$@" >> "$(dirname "$0")/calls"\nprintf %s "$FAKE_ISSUES"\n');
  chmodSync(join(bin, 'gh'), 0o755);
  return { dir, bin };
}

function file({ dir, bin }: { dir: string; bin: string }, issues: { title: string; url: string }[], ...args: string[]) {
  const run = spawnSync('bash', [FILE, '--dry-run', dir, ...args], {
    cwd: REPOSITORY,
    encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_ISSUES: JSON.stringify(issues), SLACK_CHANNEL_ID: 'C9' },
  });
  return { ...run, calls: existsSync(join(bin, 'calls')) ? readFileSync(join(bin, 'calls'), 'utf8') : '' };
}

const OK = [{ name: 'ffprobe repro.mp4', ok: true, detail: '1280×720' }];

test('filing: --dry-run prints what it would push and file, labelled "delegated to AI", {{media}} filled in, the footer under a rule', (t) => {
  const run = file(recorded(t, OK), [{ title: 'The pill says 9 of 9 and more', url: 'https://github.com/x/1' }], 'Produced by a test');
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /would push to media:recordings\/bugs\/pill-count\/abc123\/\n/);
  assert.match(run.stdout, /repro\.mp4/);
  assert.match(run.stdout, /would open an issue labelled "delegated to AI": The pill says 9 of 9\n/);
  const media = 'https://raw.githubusercontent.com/alexresiga/ai-workshop-start/media/recordings/bugs/pill-count/abc123';
  assert.ok(run.stdout.includes(`![preview](${media}/preview.gif)\n[Video](${media}/repro.mp4)\n\n---\nProduced by a test\n`), run.stdout);
  // Every open issue, matched by its title here: a search would read a `:` or `(` in the title as its syntax.
  assert.match(run.calls, /^issue list --repo alexresiga\/ai-workshop-start --state open --json title,url --limit 1000\n/);
  assert.match(run.stdout, /would post it in Slack: C9\n$/);
  assert.doesNotMatch(run.calls, /issue create/);
});

test('filing: an open issue with the same title → already open: <url>, exit 1, nothing filed', (t) => {
  const run = file(recorded(t, OK, 'Filter: the pill says (9 of 9)'),
    [{ title: 'Filter', url: 'https://github.com/x/1' }, { title: 'Filter: the pill says (9 of 9)', url: 'https://github.com/alexresiga/ai-workshop-start/issues/99' }]);
  assert.equal(run.status, 1);
  assert.equal(run.stderr, 'already open: https://github.com/alexresiga/ai-workshop-start/issues/99\n');
  assert.doesNotMatch(run.stdout, /would push/);
});

test('filing: a check that failed → listed, exit 1, nothing filed', (t) => {
  const run = file(recorded(t, [{ name: 'ffprobe repro.mp4', ok: false, detail: '0 frames' }]), []);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /✗ ffprobe repro\.mp4: 0 frames/);
  assert.equal(run.calls, '');
});

test('filing: no recording → listed, exit 1, nothing filed', (t) => {
  const dir = bugDir(t);
  const run = spawnSync('bash', [FILE, '--dry-run', dir], { cwd: REPOSITORY, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /no recording: .*esc-filter\/out\/repro\.json/);
});

// Posting in Slack: announce.sh, against a local fake Slack API.
const ANNOUNCE = fileURLToPath(new URL('../.agents/skills/red-agent/announce.sh', import.meta.url));
const { createServer } = await import('node:http');

/** A fake Slack that answers chat.postMessage with `answer`, and keeps what it was sent. */
async function slack(t: { after(fn: () => void): void }, answer: object) {
  const posts: { auth?: string; body: { channel: string; text: string } }[] = [];
  const server = createServer((request, response) => {
    let data = '';
    request.on('data', (chunk) => (data += chunk));
    request.on('end', () => {
      if (request.url === '/chat.postMessage') posts.push({ auth: request.headers.authorization, body: JSON.parse(data) });
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(answer));
    });
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return { api: `http://127.0.0.1:${(server.address() as { port: number }).port}`, posts };
}

const announce = (env: Record<string, string>) =>
  new Promise<{ status: number | null; stdout: string; stderr: string }>((done) => {
    const child = spawn('bash', [ANNOUNCE, 'https://github.com/alexresiga/ai-workshop-start/issues/99', 'Esc <leaves> the pill & more'], {
      env: { ...process.env, SLACK_BOT_TOKEN: '', SLACK_CHANNEL_ID: '', ...env },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (status) => done({ status, stdout, stderr }));
  });

test('posting in Slack: each filed issue, its link and its title, in SLACK_CHANNEL_ID', async (t) => {
  const fake = await slack(t, { ok: true, ts: '1.2' });
  const run = await announce({ SLACK_API: fake.api, SLACK_BOT_TOKEN: 'xoxb-test', SLACK_CHANNEL_ID: 'C123' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(fake.posts, [{
    auth: 'Bearer xoxb-test',
    body: { channel: 'C123', text: '🐞 The red agent filed a bug: <https://github.com/alexresiga/ai-workshop-start/issues/99|Esc &lt;leaves&gt; the pill &amp; more>' },
  }]);
  assert.equal(run.stdout, 'posted in Slack: https://github.com/alexresiga/ai-workshop-start/issues/99\n');
});

test('posting in Slack: no SLACK_BOT_TOKEN or SLACK_CHANNEL_ID → a warning, exit 0, nothing posted', async (t) => {
  const fake = await slack(t, { ok: true });
  const run = await announce({ SLACK_API: fake.api, SLACK_BOT_TOKEN: 'xoxb-test' });
  assert.equal(run.status, 0);
  assert.equal(run.stderr, 'warning: no SLACK_BOT_TOKEN or SLACK_CHANNEL_ID: not posted in Slack\n');
  assert.deepEqual(fake.posts, []);
});

test('posting in Slack: Slack refuses → its error as a warning, exit 0: the issue stands', async (t) => {
  const fake = await slack(t, { ok: false, error: 'not_in_channel' });
  const run = await announce({ SLACK_API: fake.api, SLACK_BOT_TOKEN: 'xoxb-test', SLACK_CHANNEL_ID: 'C123' });
  assert.equal(run.status, 0);
  assert.equal(run.stderr, 'warning: not posted in Slack: not_in_channel\n');
});
