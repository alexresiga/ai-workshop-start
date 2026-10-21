// spec/web.md, Clusters: `GET /api/clusters` with a fake `claude` that records what it was asked and answers what the test
// gives it; and the Cluster skills button in a real browser. GitHub answers from tests/helpers.ts.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { askClaude } from '../src/claude.ts';
import type { Ask } from '../src/core/themes.ts';
import { scanOrganization } from '../src/core/organization.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer, type ClustersAnswer } from '../src/web.ts';
import { organizationAnswers, ORGANIZATION, skill, type Listed } from './helpers.ts';

/**
 * A `claude` that saves its pid, working directory and what that holds to `started.json`, its arguments and stdin to
 * `asked.json`; waits `wait.txt` milliseconds, if there is one; then prints `answer.txt` and exits with `exit.txt`.
 */
const FAKE = `#!/usr/bin/env node
const { existsSync, readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const here = (name) => join(__dirname, name);
writeFileSync(here('started.json'), JSON.stringify({ pid: process.pid, cwd: process.cwd(), files: readdirSync(process.cwd()) }));
let stdin = '';
process.stdin.on('data', (chunk) => (stdin += chunk));
process.stdin.on('end', () => {
  writeFileSync(here('asked.json'), JSON.stringify({ args: process.argv.slice(2), stdin }));
  setTimeout(() => {
    process.stdout.write(readFileSync(here('answer.txt'), 'utf8'));
    process.exitCode = Number(readFileSync(here('exit.txt'), 'utf8'));
  }, existsSync(here('wait.txt')) ? Number(readFileSync(here('wait.txt'), 'utf8')) : 0);
});
`;

/** What `claude -p --output-format json` prints: the model's text as `result`. */
const reply = (result: string, isError = false) => JSON.stringify({ type: 'result', subtype: 'success', is_error: isError, result });

/** The model's JSON: each theme and its skill numbers. */
const clusters = (themes: [string, number[]][]) => JSON.stringify({ clusters: themes.map(([theme, skills]) => ({ theme, skills })) });

/** A fake `claude` that prints `stdout` and exits with `exit`, after `wait` ms; what it was asked, once it ran. */
function fakeClaude(t: TestContext, stdout: string, exit = 0, wait?: number) {
  const dir = mkdtempSync(join(tmpdir(), 'skill-atlas-claude-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const binary = join(dir, 'claude.cjs');
  writeFileSync(binary, FAKE);
  chmodSync(binary, 0o755);
  writeFileSync(join(dir, 'answer.txt'), stdout);
  writeFileSync(join(dir, 'exit.txt'), String(exit));
  if (wait !== undefined) writeFileSync(join(dir, 'wait.txt'), String(wait));
  const read = <T>(name: string) => (existsSync(join(dir, name)) ? (JSON.parse(readFileSync(join(dir, name), 'utf8')) as T) : undefined);
  const asked = () => read<{ args: string[]; stdin: string }>('asked.json');
  const started = () => read<{ pid: number; cwd: string; files: string[] }>('started.json');
  return { binary, asked, started };
}

/** The web view, GitHub answering for JetBrains' repositories, the model asked through `ask`. */
async function serve(t: { after(fn: () => void): void }, ask: Ask | undefined, repositories: Record<string, Listed> = ORGANIZATION) {
  const server = createWebServer({
    open: () => Promise.reject(new Error('not scanned')),
    organization: (url, progress) =>
      scanOrganization(url, { fetch: replay(organizationAnswers('JetBrains', 'Organization', repositories)), token: 'test' }, progress),
    ask,
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

/** `GET /api/clusters?name=<name>`, with the fake `claude` printing `stdout`. */
async function clustersFor(t: TestContext, stdout: string, { name = 'JetBrains', exit = 0, repositories = ORGANIZATION } = {}) {
  const claude = fakeClaude(t, stdout, exit);
  const base = await serve(t, (prompt, signal) => askClaude(prompt, { binary: claude.binary, signal }), repositories);
  const response = await fetch(`${base}/api/clusters?name=${encodeURIComponent(name)}`);
  const answer = (await response.json()) as ClustersAnswer & { error: string };
  return { status: response.status, answer, asked: claude.asked(), started: claude.started() };
}

/** Each cluster's theme and its skills' names. */
const themes = (answer: ClustersAnswer) => answer.clusters.map((cluster) => [cluster.theme, cluster.skills.map((skill) => skill.name)]);

/** Only the question's numbered lines. */
const numbered = (stdin: string) => stdin.split('\n').filter((line) => /^\d+\. /.test(line));

// ORGANIZATION's skills, numbered by name: 1 a, 2 b (idea), 3 build (kotlin), 4 c (idea), 5 lint (android),
// 6 release (kotlin), 7 review (android).
const listed = (name: string, repository: string, path: string) => ({
  name,
  description: `Run the ${name}.`,
  repository: `JetBrains/${repository}`,
  path,
  link: `https://github.com/JetBrains/${repository}/blob/main/${path}`,
});
const A = listed('a', 'idea', '.agents/skills/a/SKILL.md');
const B = listed('b', 'idea', '.agents/skills/b/SKILL.md');
const BUILD = listed('build', 'kotlin', '.agents/skills/build/SKILL.md');
const C = listed('c', 'idea', 'docs/c/SKILL.md');
const LINT = listed('lint', 'android', 'agent/skills/lint/SKILL.md');
const RELEASE = listed('release', 'kotlin', '.claude/skills/release/SKILL.md');
const REVIEW = listed('review', 'android', '.claude/skills/review/SKILL.md');

const ANSWER = clusters([['Releases', [6]], ['Build', [3, 5, 1, 2]], ['Review', [7, 4]]]);

test('clusters: most skills first, each with its skills by name, linked to its SKILL.md, with its repository', async (t) => {
  const { status, answer } = await clustersFor(t, reply(ANSWER));
  assert.equal(status, 200);
  assert.deepEqual(answer, {
    organization: { id: 'JetBrains', url: 'https://github.com/JetBrains' },
    skills: 7,
    clusters: [
      { theme: 'Build', skills: [A, B, BUILD, LINT] },
      { theme: 'Review', skills: [C, REVIEW] },
      { theme: 'Releases', skills: [RELEASE] },
    ],
    warnings: [],
  } satisfies ClustersAnswer);
});

test('the model: haiku through claude -p, no session; each skill numbered by name on stdin, the answer as JSON', async (t) => {
  const { asked } = await clustersFor(t, reply(ANSWER));
  assert.deepEqual(asked!.args.slice(0, 6), ['-p', '--model', 'haiku', '--output-format', 'json', '--no-session-persistence']);
  assert.match(asked!.stdin, /\{"clusters": \[\{"theme": "<theme>", "skills": \[<skill numbers>\]\}\]\}/);
  assert.deepEqual(numbered(asked!.stdin), [
    '1. a — Run the a.',
    '2. b — Run the b.',
    '3. build — Run the build.',
    '4. c — Run the c.',
    '5. lint — Run the lint.',
    '6. release — Run the release.',
    '7. review — Run the review.',
  ]);
});

test('no tools: no built-in tool, no MCP server; in an empty directory of its own, removed after', async (t) => {
  const { asked, started } = await clustersFor(t, reply(ANSWER));
  assert.deepEqual(asked!.args.slice(6), ['--tools', '', '--strict-mcp-config', '--disallowedTools', 'mcp__*']);
  assert.notEqual(started!.cwd, process.cwd());
  assert.deepEqual(started!.files, []);
  assert.equal(existsSync(started!.cwd), false);
});

/** Whether the process is still running. */
const alive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

test('a character split between two chunks of the answer stays whole, in the theme and in an error', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-atlas-claude-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // Writes its answer's bytes in two parts, with a pause, the split inside the two bytes of è; then the same on stderr.
  const split = (stream: string, text: string) => `
    const bytes = Buffer.from(${JSON.stringify(text)});
    const at = bytes.indexOf(Buffer.from('è')) + 1;
    process.${stream}.write(bytes.subarray(0, at));
    setTimeout(() => process.${stream}.write(bytes.subarray(at)), 50);`;
  const binary = join(dir, 'claude.cjs');
  const write = (body: string) => {
    writeFileSync(binary, `#!/usr/bin/env node\nprocess.stdin.resume().on('end', () => {${body}});\n`);
    chmodSync(binary, 0o755);
  };
  write(split('stdout', reply(clusters([['Thème', [1, 2, 3, 4, 5, 6, 7]]]))));
  const base = await serve(t, (prompt) => askClaude(prompt, { binary }));
  const answer = (await (await fetch(`${base}/api/clusters?name=JetBrains`)).json()) as ClustersAnswer;
  assert.deepEqual(answer.clusters.map((cluster) => cluster.theme), ['Thème']);
  write(`${split('stderr', 'Erreur: accès refusé')}\n    setTimeout(() => (process.exitCode = 1), 100);`);
  const failed = (await (await fetch(`${base}/api/clusters?name=JetBrains`)).json()) as { error: string };
  assert.match(failed.error, /could not cluster the skills: Erreur: accès refusé$/);
});

/** Whether `check` comes true within 4 s. */
const until = async (check: () => boolean) => {
  for (let i = 0; i < 200 && !check(); i++) await new Promise((done) => setTimeout(done, 20));
  return check();
};

test('more than the time allowed → claude stopped, the clear message, status 400', async (t) => {
  const claude = fakeClaude(t, reply(ANSWER), 0, 60_000);
  const base = await serve(t, (prompt) => askClaude(prompt, { binary: claude.binary, timeout: 300 }));
  const response = await fetch(`${base}/api/clusters?name=JetBrains`);
  assert.equal(response.status, 400);
  assert.match(((await response.json()) as { error: string }).error, /claude\.cjs took too long to cluster the skills$/);
  assert.equal(await until(() => !alive(claude.started()!.pid)), true);
});

/** A `claude` that runs `body` once it has its question; its pid and its child's, if it starts one, in `pids.json`. */
function stubClaude(t: TestContext, body: string) {
  const dir = mkdtempSync(join(tmpdir(), 'skill-atlas-claude-'));
  const pids = () => (existsSync(join(dir, 'pids.json')) ? (JSON.parse(readFileSync(join(dir, 'pids.json'), 'utf8')) as number[]) : []);
  t.after(() => {
    for (const pid of pids()) if (alive(pid)) process.kill(pid, 'SIGKILL');
    rmSync(dir, { recursive: true, force: true });
  });
  const binary = join(dir, 'claude.cjs');
  writeFileSync(
    binary,
    `#!/usr/bin/env node
const { writeFileSync } = require('node:fs');
const pids = (more = []) => writeFileSync(${JSON.stringify(join(dir, 'pids.json'))}, JSON.stringify([process.pid, ...more]));
pids();
process.stdin.resume().on('end', () => {${body}});
`,
  );
  chmodSync(binary, 0o755);
  return { binary, pids };
}

test('a claude that ignores SIGTERM → the clear message at the time allowed; killed after its grace', async (t) => {
  const claude = stubClaude(t, `process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);`);
  const started = Date.now();
  await assert.rejects(askClaude('question', { binary: claude.binary, timeout: 300, grace: 300 }), /took too long to cluster the skills$/);
  assert.ok(Date.now() - started < 2000);
  const [pid] = claude.pids();
  assert.equal(await until(() => !alive(pid)), true);
});

test('a claude gone, but a process it started still holding its stdout → the clear message at the time allowed', async (t) => {
  const grandchild = `require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' })`;
  const claude = stubClaude(t, `const child = ${grandchild}; pids([child.pid]); process.exit(0);`);
  const started = Date.now();
  await assert.rejects(askClaude('question', { binary: claude.binary, timeout: 300 }), /took too long to cluster the skills$/);
  assert.ok(Date.now() - started < 2000);
  assert.equal(claude.pids().length, 2);
});

test('claude done, its answer in full, but a process it started still holding its stdout → the answer', async (t) => {
  const grandchild = `require('node:child_process').spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'inherit' })`;
  const answer = JSON.stringify(reply(ANSWER));
  const claude = stubClaude(t, `process.stdout.write(${answer}); const child = ${grandchild}; pids([child.pid]); process.exit(0);`);
  const started = Date.now();
  assert.equal(await askClaude('question', { binary: claude.binary, timeout: 4000, grace: 300 }), ANSWER);
  assert.ok(Date.now() - started < 2000);
});

test('progress: the organization scanned again, then how many skills the model is asked about, then the answer, one JSON a line', async (t) => {
  const claude = fakeClaude(t, reply(ANSWER));
  const base = await serve(t, (prompt, signal) => askClaude(prompt, { binary: claude.binary, signal }));
  const response = await fetch(`${base}/api/clusters/progress?name=JetBrains`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/x-ndjson/);
  const lines = (await response.text()).trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(lines.slice(0, -1), [
    ...[0, 1, 2, 3, 4, 5].map((scanned) => ({ progress: { scanned, of: 5 } })),
    { clustering: 7 },
  ]);
  assert.deepEqual(lines.at(-1).clusters.map((cluster: { theme: string }) => cluster.theme), ['Build', 'Review', 'Releases']);
});

test('progress: no skills → no clustering line; a failure → { error } last; not an organization → status 400', async (t) => {
  const empty = await serve(t, async () => ANSWER, { website: { 'README.md': '# website\n' } });
  const none = (await (await fetch(`${empty}/api/clusters/progress?name=JetBrains`)).text()).trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(none.slice(0, -1), [{ progress: { scanned: 0, of: 1 } }, { progress: { scanned: 1, of: 1 } }]);
  assert.deepEqual(none.at(-1).clusters, []);
  const failing = await serve(t, (prompt) => askClaude(prompt, { binary: NO_CLAUDE }));
  const failed = (await (await fetch(`${failing}/api/clusters/progress?name=JetBrains`)).text()).trim().split('\n').at(-1)!;
  assert.deepEqual(JSON.parse(failed), { error: `Cannot run ${NO_CLAUDE}: clustering needs Claude Code (claude) on the PATH, or CLAUDE set to it` });
  const response = await fetch(`${failing}/api/clusters/progress?name=JetBrains/kotlin`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Not a GitHub organization: JetBrains/kotlin' });
});

test('the page closed while it runs → claude stopped', async (t) => {
  const claude = fakeClaude(t, reply(ANSWER), 0, 60_000);
  const { promise: stopped, resolve: stop } = Promise.withResolvers<unknown>();
  const base = await serve(t, (prompt, signal) => askClaude(prompt, { binary: claude.binary, signal }).catch((error) => (stop(error), '')));
  const page = new AbortController();
  const request = fetch(`${base}/api/clusters/progress?name=JetBrains`, { signal: page.signal })
    .then((response) => response.text())
    .catch(() => undefined);
  while (!claude.asked()) await new Promise((done) => setTimeout(done, 20));
  page.abort();
  await request;
  assert.match(String(await stopped), /No one is waiting for the clusters/);
  assert.equal(await until(() => !alive(claude.started()!.pid)), true);
});

test('the question: the description’s first sentence, cut at 160 characters', async (t) => {
  const words = 'Word '.repeat(40).trim();
  const files = {
    '.claude/skills/long/SKILL.md': `---\nname: long\ndescription: ${words}. A second sentence.\n---\n`,
    '.claude/skills/short/SKILL.md': '---\nname: short\ndescription: One sentence. And another.\n---\n',
  };
  const { asked } = await clustersFor(t, reply(clusters([['All', [1, 2]]])), { repositories: { tools: files } });
  assert.deepEqual(numbered(asked!.stdin), [`1. long — ${words.slice(0, 159)}…`, '2. short — One sentence.']);
});

test('skills with the same line, one copied into many repositories, share a number and a cluster', async (t) => {
  const copied = { '.claude/skills/commit/SKILL.md': skill('commit') };
  const { answer, asked } = await clustersFor(t, reply(clusters([['Git', [1]]])), { repositories: { one: copied, two: copied } });
  assert.deepEqual(numbered(asked!.stdin), ['1. commit — Run the commit.']);
  assert.deepEqual(
    answer.clusters.map((cluster) => [cluster.theme, cluster.skills.map((s) => s.repository)]),
    [['Git', ['JetBrains/one', 'JetBrains/two']]],
  );
  assert.deepEqual(answer.warnings, []);
});

test('clusters of the same size: by theme', async (t) => {
  const { answer } = await clustersFor(t, reply(clusters([['Zeta', [1, 2]], ['Alpha', [3, 4]], ['Mid', [5, 6, 7]]])));
  assert.deepEqual(themes(answer).map(([theme]) => theme), ['Mid', 'Alpha', 'Zeta']);
});

test('the answer inside a ```json fence, after a sentence, is read', async (t) => {
  const { status, answer } = await clustersFor(t, reply(`Here are the clusters:\n\`\`\`json\n${ANSWER}\n\`\`\`\n`));
  assert.equal(status, 200);
  assert.deepEqual(themes(answer).map(([theme]) => theme), ['Build', 'Review', 'Releases']);
});

test('every skill in exactly one cluster: left out → Other, last; twice → the first; an unknown number → ignored; each a warning', async (t) => {
  // b (2) twice, release (6) and review (7) left out, 9 not in the list.
  const { status, answer } = await clustersFor(t, reply(clusters([['Build', [1, 2, 3, 9]], ['Code', [2, 4, 5]]])));
  assert.equal(status, 200);
  assert.deepEqual(answer.clusters, [
    { theme: 'Build', skills: [A, B, BUILD] },
    { theme: 'Code', skills: [C, LINT] },
    { theme: 'Other', skills: [RELEASE, REVIEW] },
  ]);
  assert.deepEqual(answer.warnings, [
    'the model named numbers not in the list: 9; ignored',
    'the model named b more than once; kept in the first cluster',
    'the model left out release, review; in Other',
  ]);
});

test('Other comes last even when it is the largest; a theme named twice is one cluster', async (t) => {
  const { answer } = await clustersFor(t, reply(clusters([['Build', [3]], ['Other', [1, 2, 4]], ['Build', [5]]])));
  assert.deepEqual(themes(answer), [
    ['Build', ['build', 'lint']],
    ['Other', ['a', 'b', 'c', 'release', 'review']],
  ]);
  assert.deepEqual(answer.warnings, ['the model left out release, review; in Other']);
});

test('a warning names ten, each once, and how many more', async (t) => {
  const tools = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`.claude/skills/s${i + 10}/SKILL.md`, skill(`s${i + 10}`)]));
  const { answer } = await clustersFor(t, reply(clusters([['None', [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 13]]])), { repositories: { tools } });
  assert.deepEqual(answer.warnings, [
    'the model named numbers not in the list: 13, 14, 15, 16, 17, 18, 19, 20, 21, 22 and 1 more; ignored',
    'the model left out s10, s11, s12, s13, s14, s15, s16, s17, s18, s19 and 2 more; in Other',
  ]);
});

test('the scan’s warnings come first, then the model’s', async (t) => {
  const repositories = { tools: { '.claude/skills/x/SKILL.md': '---\nname: [x\n---\n', '.claude/skills/y/SKILL.md': skill('y') } };
  const { answer } = await clustersFor(t, reply(clusters([['Tools', [2]]])), { repositories });
  assert.equal(answer.warnings.length, 2);
  assert.match(answer.warnings[0], /^JetBrains\/tools: \.claude\/skills\/x\/SKILL\.md: malformed front matter: /);
  assert.equal(answer.warnings[1], 'the model left out x; in Other');
});

test('no skills → no clusters, the model not asked', async (t) => {
  const { status, answer, asked } = await clustersFor(t, reply(ANSWER), { repositories: { website: { 'README.md': '# website\n' } } });
  assert.equal(status, 200);
  assert.deepEqual(answer, { organization: { id: 'JetBrains', url: 'https://github.com/JetBrains' }, skills: 0, clusters: [], warnings: [] });
  assert.equal(asked, undefined);
});

test('org/ and a GitHub link name the organization too', async (t) => {
  for (const name of ['JetBrains/', 'https://github.com/JetBrains']) {
    assert.equal((await clustersFor(t, reply(ANSWER), { name })).status, 200, name);
  }
});

test('not an organization → status 400, the model not asked', async (t) => {
  const { status, answer, asked } = await clustersFor(t, reply(ANSWER), { name: 'JetBrains/kotlin' });
  assert.equal(status, 400);
  assert.deepEqual(answer, { error: 'Not a GitHub organization: JetBrains/kotlin' });
  assert.equal(asked, undefined);
});

const NO_CLAUDE = join(tmpdir(), 'skill-atlas-no-such-claude');

test('no claude → the clear message, status 400', async (t) => {
  const base = await serve(t, (prompt) => askClaude(prompt, { binary: NO_CLAUDE }));
  const response = await fetch(`${base}/api/clusters?name=JetBrains`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: `Cannot run ${NO_CLAUDE}: clustering needs Claude Code (claude) on the PATH, or CLAUDE set to it`,
  });
});

test('an error from claude, such as not logged in → its message, status 400', async (t) => {
  const { status, answer } = await clustersFor(t, reply('Not logged in · Please run /login', true));
  assert.equal(status, 400);
  assert.match(answer.error, /claude\.cjs could not cluster the skills: Not logged in · Please run \/login$/);
});

test('claude failing with no answer → its exit code, status 400', async (t) => {
  const { status, answer } = await clustersFor(t, '', { exit: 3 });
  assert.equal(status, 400);
  assert.match(answer.error, /claude\.cjs could not cluster the skills: exit code 3$/);
});

test('an answer that is not the clusters → the clear message, status 400', async (t) => {
  const { status, answer } = await clustersFor(t, reply('I cannot group these.'));
  assert.equal(status, 400);
  assert.deepEqual(answer, { error: "The model's answer is not the clusters asked for: I cannot group these." });
});

test('no model on the server → status 400', async (t) => {
  const base = await serve(t, undefined);
  const response = await fetch(`${base}/api/clusters?name=JetBrains`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Clustering is not available here' });
});

test('/api/organization does not send the skills', async (t) => {
  const base = await serve(t, undefined);
  const answer = (await (await fetch(`${base}/api/organization?name=JetBrains`)).json()) as object;
  assert.deepEqual(Object.keys(answer).sort(), ['organization', 'repositories', 'scanned', 'warnings']);
});

// Chromium, as CI installs it: `npx playwright install --with-deps chromium`; one that cannot start skips the browser tests.
const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

/** The organization's page, the model answering through `ask`. */
async function organizationPage(t: TestContext, ask: Ask, repositories: Record<string, Listed> = ORGANIZATION): Promise<Page> {
  const base = await serve(t, ask, repositories);
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?org=JetBrains`);
  await expect(page.locator('#count')).toBeVisible();
  return page;
}

browserTest('Cluster skills: clustering, the button disabled; then each cluster, its pill, and its skills', async (t) => {
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  const page = await organizationPage(t, async () => (await gate, ANSWER));
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.getByRole('button', { name: 'Clustering…' })).toBeDisabled();
  await expect(page.locator('#clusters')).toHaveText('Clustering 7 skills with haiku…');
  release();
  await expect(page.getByRole('button', { name: 'Cluster skills' })).toBeEnabled();
  await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
  await expect(page.locator('#clusters .theme h3')).toHaveText(['Build4 skills', 'Review2 skills', 'Releases1 skill']);
  const build = page.locator('#clusters .theme').first().locator('li');
  await expect(build).toHaveText([
    'aJetBrains/ideaRun the a.',
    'bJetBrains/ideaRun the b.',
    'buildJetBrains/kotlinRun the build.',
    'lintJetBrains/androidRun the lint.',
  ]);
  await expect(build.first().getByRole('link', { name: 'a', exact: true })).toHaveAttribute('href', A.link);
  await expect(page.locator('#warnings')).toBeEmpty();
});

browserTest('the model’s warnings go under the header', async (t) => {
  const page = await organizationPage(t, async () => clusters([['Build', [1, 2, 3, 4, 5, 6]]]));
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.locator('#clusters .theme h3')).toHaveText(['Build6 skills', 'Other1 skill']);
  await expect(page.locator('#warnings li')).toHaveText(['warning: the model left out review; in Other']);
  // Hidden by default, as the scan's.
  await expect(page.locator('#warnings-toggle')).toHaveText('⚠ 1 warning');
  await expect(page.locator('#warnings')).toBeHidden();
});

browserTest('the clustering’s warnings change the count, not whether they are shown', async (t) => {
  const repositories = { tools: { '.claude/skills/x/SKILL.md': '---\nname: [x\n---\n', '.claude/skills/y/SKILL.md': skill('y') } };
  let asked = 0;
  const page = await organizationPage(t, async () => (asked++ ? clusters([['Tools', [2]]]) : clusters([['Tools', [1, 2]]])), repositories);
  const toggle = page.locator('#warnings-toggle');
  await expect(toggle).toHaveText('⚠ 1 warning');
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.locator('#clusters .theme h3')).toHaveText(['Tools2 skills']);
  await expect(page.locator('#warnings')).toBeHidden();
  await toggle.click();
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(toggle).toHaveText('⚠ 2 warnings');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#warnings li')).toHaveText([/malformed front matter/, 'warning: the model left out x; in Other']);
  await expect(page.locator('#warnings li').last()).toBeVisible();
});

browserTest('clustering again: the last answer’s warnings go, the scan’s stay', async (t) => {
  const repositories = { tools: { '.claude/skills/x/SKILL.md': '---\nname: [x\n---\n', '.claude/skills/y/SKILL.md': skill('y') } };
  let asked = 0;
  const page = await organizationPage(t, async () => (asked++ ? clusters([['Tools', [1, 2]]]) : clusters([['Tools', [2]]])), repositories);
  await expect(page.locator('#warnings li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.locator('#warnings li')).toHaveText([/malformed front matter/, 'warning: the model left out x; in Other']);
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.locator('#clusters .theme h3')).toHaveText(['Tools2 skills']);
  await expect(page.locator('#warnings li')).toHaveText([/malformed front matter/]);
});

browserTest('a failure → the clear message, under the button, in the error color', async (t) => {
  const page = await organizationPage(t, (prompt) => askClaude(prompt, { binary: NO_CLAUDE }));
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.locator('#clusters .error')).toHaveText(
    `Cannot run ${NO_CLAUDE}: clustering needs Claude Code (claude) on the PATH, or CLAUDE set to it`,
  );
  // --error, light: #c0392b, not the summary's muted grey.
  await expect(page.locator('#clusters .error')).toHaveCSS('color', 'rgb(192, 57, 43)');
  await expect(page.getByRole('button', { name: 'Cluster skills' })).toBeEnabled();
});

browserTest('home, while clustering, drops the answer', async (t) => {
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  const { promise: asked, resolve: ask } = Promise.withResolvers<void>();
  const { promise: answered, resolve: answer } = Promise.withResolvers<void>();
  const page = await organizationPage(t, async () => (ask(), await gate, setTimeout(answer, 300), ANSWER));
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await asked;
  await page.locator('#home').click();
  release();
  await answered;
  await expect(page.locator('#skills')).toHaveText('Paste a repository or an organization and press Scan.');
  await expect(page.locator('#detail')).toBeEmpty();
});

browserTest('a new scan, while clustering, drops the answer', async (t) => {
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  const { promise: asked, resolve: ask } = Promise.withResolvers<void>();
  const { promise: answered, resolve: answer } = Promise.withResolvers<void>();
  const page = await organizationPage(t, async () => (ask(), await gate, setTimeout(answer, 300), ANSWER));
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await asked;
  await page.getByLabel('Repository or organization link').fill('JetBrains');
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(page.getByRole('button', { name: 'Cluster skills' })).toBeEnabled();
  release();
  await answered;
  await expect(page.locator('#clusters')).toBeEmpty();
  await expect(page.locator('#clusters .theme')).toHaveCount(0);
});

browserTest('no skills → no Cluster skills button', async (t) => {
  const base = await serve(t, async () => ANSWER, { website: { 'README.md': '# website\n' } });
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?org=JetBrains`);
  await expect(page.locator('#skills')).toHaveText('No SKILL.md in any of JetBrains’s 1 repository.');
  await expect(page.getByRole('button', { name: 'Cluster skills' })).toHaveCount(0);
});
