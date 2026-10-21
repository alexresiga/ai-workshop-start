// spec/web.md, Clusters: `GET /api/clusters` with a fake `claude` that records what it was asked and answers what the test
// gives it; and, in a real browser, the clusters that start once an organization is scanned. GitHub answers from tests/helpers.ts.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, type TestContext } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { askClaude } from '../src/claude.ts';
import { clusterSkills, type Ask } from '../src/core/themes.ts';
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

/** The last line `claude -p --output-format stream-json` prints: the model's text as `result`. */
const reply = (result: string, isError = false) => JSON.stringify({ type: 'result', subtype: 'success', is_error: isError, result });

/**
 * What `claude -p --output-format stream-json --verbose --include-partial-messages` prints: the session's start, the text
 * in `parts` as it streams, the whole message, then the result.
 */
const streamed = (parts: string[]) =>
  [
    { type: 'system', subtype: 'init', model: 'claude-haiku-4-5' },
    { type: 'stream_event', event: { type: 'message_start', message: { content: [] } } },
    { type: 'stream_event', event: { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } } },
    ...parts.map((text) => ({ type: 'stream_event', event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } } })),
    { type: 'stream_event', event: { type: 'content_block_stop', index: 0 } },
    { type: 'assistant', message: { content: [{ type: 'text', text: parts.join('') }] } },
  ]
    .map((line) => JSON.stringify(line) + '\n')
    .join('') + reply(parts.join('')) + '\n';

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
/** How many times the organization has been scanned, by every server here. */
let scans = 0;

async function serve(t: { after(fn: () => void): void }, ask: Ask | undefined, repositories: Record<string, Listed> = ORGANIZATION) {
  const server = createWebServer({
    open: () => Promise.reject(new Error('not scanned')),
    organization: (url, progress) =>
      (scans++, scanOrganization(url, { fetch: replay(organizationAnswers('JetBrains', 'Organization', repositories)), token: 'test' }, progress)),
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

test('the model: haiku through claude -p, streamed, no session; each skill numbered by name on stdin, the answer as JSON', async (t) => {
  const { asked } = await clustersFor(t, reply(ANSWER));
  assert.deepEqual(asked!.args.slice(0, 8), [
    '-p',
    '--model',
    'haiku',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--no-session-persistence',
  ]);
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
  assert.deepEqual(asked!.args.slice(8), ['--tools', '', '--strict-mcp-config', '--disallowedTools', 'mcp__*']);
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

test('progress: the organization scanned, its answer, then how many skills the model is asked about, then the clusters, one JSON a line', async (t) => {
  const claude = fakeClaude(t, reply(ANSWER));
  const base = await serve(t, (prompt, signal) => askClaude(prompt, { binary: claude.binary, signal }));
  const response = await fetch(`${base}/api/clusters/progress?name=JetBrains`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/x-ndjson/);
  const lines = (await response.text()).trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(lines.slice(0, -1), [
    ...[0, 1, 2, 3, 4, 5].map((scanned) => ({ progress: { scanned, of: 5 } })),
    { scan: await (await fetch(`${base}/api/organization?name=JetBrains`)).json() },
    { clustering: 7 },
  ]);
  assert.deepEqual(lines.at(-3).scan.repositories.map((repository: { id: string }) => repository.id), [
    'JetBrains/idea',
    'JetBrains/android',
    'JetBrains/kotlin',
  ]);
  assert.deepEqual(lines.at(-1).clusters.map((cluster: { theme: string }) => cluster.theme), ['Build', 'Review', 'Releases']);
});

// ANSWER as the model streams it, in parts that end inside a list, a number not yet known to be whole.
const PARTS = ['{"clusters": [{"theme": "Releases", "skills": [6', ']}, {"theme": "Build", "skills": [3, 5', ', 1, 2]}, {"theme": "Review", "skills": [7, ', '4]}]}'];

test('streamed: the text heard as it comes, part by part; the answer from the result line', async (t) => {
  const claude = fakeClaude(t, streamed(PARTS));
  const heard: string[] = [];
  assert.equal(await askClaude('question', { binary: claude.binary, partial: (text) => heard.push(text) }), PARTS.join(''));
  assert.deepEqual(heard, PARTS.map((_, i) => PARTS.slice(0, i + 1).join('')));
});

test('streamed: a line split between two chunks is read whole; an error result → its message', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'skill-atlas-claude-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const binary = join(dir, 'claude.cjs');
  const output = streamed(['{"clusters": [{"theme": "Thème", ', '"skills": [1]}]}']);
  const at = output.indexOf('Thème') + 2;
  writeFileSync(
    binary,
    `#!/usr/bin/env node\nprocess.stdin.resume().on('end', () => { process.stdout.write(${JSON.stringify(output.slice(0, at))}); setTimeout(() => process.stdout.write(${JSON.stringify(output.slice(at))}), 50); });\n`,
  );
  chmodSync(binary, 0o755);
  const heard: string[] = [];
  assert.equal(await askClaude('question', { binary, partial: (text) => heard.push(text) }), '{"clusters": [{"theme": "Thème", "skills": [1]}]}');
  assert.deepEqual(heard, ['{"clusters": [{"theme": "Thème", ', '{"clusters": [{"theme": "Thème", "skills": [1]}]}']);
  const failing = fakeClaude(t, streamed([]).replace(/"is_error":false,"result":""/, '"is_error":true,"result":"Not logged in · Please run /login"'), 1);
  await assert.rejects(askClaude('question', { binary: failing.binary }), /could not cluster the skills: Not logged in · Please run \/login$/);
});

test('progress: as the model answers, how many skills it has put in a cluster, of how many, before the answer', async (t) => {
  const claude = fakeClaude(t, streamed(PARTS));
  const base = await serve(t, (prompt, signal, partial) => askClaude(prompt, { binary: claude.binary, signal, partial }));
  const lines = (await (await fetch(`${base}/api/clusters/progress?name=JetBrains`)).text()).trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(lines.slice(7, -1), [
    { clustering: 7 },
    // 6 whole once its `]` comes; then 3; then 5, 1, 2 and 7; then 4.
    { clustered: { skills: 2, of: 7 } },
    { clustered: { skills: 6, of: 7 } },
    { clustered: { skills: 7, of: 7 } },
  ]);
  assert.deepEqual(lines.at(-1).clusters.map((cluster: { theme: string }) => cluster.theme), ['Build', 'Review', 'Releases']);
});

/** What `clustered` hears as `ask` streams `parts`, for the skills of `repositories`. */
async function heardFor(parts: string[], repositories: Record<string, Listed> = ORGANIZATION) {
  const { skills } = await scanOrganization('https://github.com/JetBrains', {
    fetch: replay(organizationAnswers('JetBrains', 'Organization', repositories)),
    token: 'test',
  });
  const heard: [number, number][] = [];
  const ask: Ask = async (_, __, partial) => {
    parts.forEach((_, i) => partial?.(parts.slice(0, i + 1).join('')));
    return parts.join('');
  };
  await clusterSkills(skills, ask, undefined, (clustered, of) => heard.push([clustered, of]));
  return heard;
}

test('progress: a number counts once it is whole, once; one not in the list, or named again, does not', async () => {
  // 1, then 12 not in the list, 1 again, 9 not in the list; `3` not whole until the comma after it.
  const parts = ['```json\n{"clusters": [{"theme": "A", "skills": [1', '2, 1, 9, 3', ', 4]}', ', {"theme": "B", "skills": [2]}]}\n```'];
  assert.deepEqual(await heardFor(parts), [[1, 7], [3, 7], [4, 7]]);
});

test('progress: a number shared by copies in many repositories counts each of its skills', async () => {
  const copied = { '.claude/skills/commit/SKILL.md': skill('commit') };
  const parts = ['{"clusters": [{"theme": "Git", "skills": [', '1]}]}'];
  assert.deepEqual(await heardFor(parts, { one: copied, two: copied, three: copied }), [[3, 3]]);
});

test('progress: no skills → no clustering line; a failure → { error } last; not an organization → status 400', async (t) => {
  const empty = await serve(t, async () => ANSWER, { website: { 'README.md': '# website\n' } });
  const none = (await (await fetch(`${empty}/api/clusters/progress?name=JetBrains`)).text()).trim().split('\n').map((line) => JSON.parse(line));
  assert.deepEqual(none.slice(0, -1), [
    { progress: { scanned: 0, of: 1 } },
    { progress: { scanned: 1, of: 1 } },
    { scan: { organization: { id: 'JetBrains', url: 'https://github.com/JetBrains' }, repositories: [], scanned: 1, warnings: [] } },
  ]);
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

test('no model on the server → status 400; streamed, the scan’s answer, then { error }', async (t) => {
  const base = await serve(t, undefined);
  const response = await fetch(`${base}/api/clusters?name=JetBrains`);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Clustering is not available here' });
  const lines = (await (await fetch(`${base}/api/clusters/progress?name=JetBrains`)).text()).trim().split('\n').map((line) => JSON.parse(line));
  assert.ok(lines.at(-2).scan);
  assert.deepEqual(lines.at(-1), { error: 'Clustering is not available here' });
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

browserTest('once the organization is scanned, its skills are clustered at once, from that one scan', async (t) => {
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  const before = scans;
  const page = await organizationPage(t, async () => (await gate, ANSWER));
  // The repositories meanwhile, the Scan button enabled again; no button to press.
  await expect(page.locator('#skills .name')).toHaveText(['JetBrains/idea', 'JetBrains/android', 'JetBrains/kotlin']);
  await expect(page.locator('#clusters')).toHaveText('Clustering 7 skills with haiku…');
  await expect(page.locator('#clusters .spinner')).toBeVisible();
  await expect(page.locator('#button')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Cluster skills' })).toBeHidden();
  release();
  await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
  await expect(page.locator('#clusters .theme h3')).toHaveText(['Build4 skills', 'Review2 skills', 'Releases1 skill']);
  const build = page.locator('#clusters .theme').first().locator('li');
  await expect(build).toHaveText([
    'aJetBrains/ideaRun the a.',
    'bJetBrains/ideaRun the b.',
    'buildJetBrains/kotlinRun the build.',
    'lintJetBrains/androidRun the lint.',
  ]);
  await page.locator('#clusters .theme h3 button').first().click();
  await expect(build.first().getByRole('link', { name: 'a', exact: true })).toHaveAttribute('href', A.link);
  await expect(page.locator('#warnings')).toBeEmpty();
  await expect(page.getByRole('button', { name: 'Cluster skills' })).toBeHidden();
  // The organization scanned once, for its repositories and its clusters.
  assert.equal(scans - before, 1);
});

browserTest('clustering: a progress bar of the skills, moving on as the model puts them in clusters; the same spinner', async (t) => {
  const { promise: asked, resolve: ask } = Promise.withResolvers<(text: string) => void>();
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  const page = await organizationPage(t, async (_, __, partial) => (ask(partial!), await gate, ANSWER));
  const partial = await asked;
  const bar = page.getByRole('progressbar', { name: 'Skills clustered' });
  await expect(page.locator('#clustering .text')).toHaveText('Clustering 7 skills with haiku…');
  await expect(bar).toHaveJSProperty('value', 0);
  await expect(bar).toHaveJSProperty('max', 7);
  await expect(page.getByRole('progressbar', { name: 'Repositories scanned' })).toHaveCount(0);
  const spinner = await page.locator('#clustering .spinner').elementHandle();
  partial(PARTS.slice(0, 3).join(''));
  await expect(page.locator('#clustering .text')).toHaveText('Clustered 6 of 7 skills with haiku…');
  await expect(bar).toHaveJSProperty('value', 6);
  partial(PARTS.join(''));
  await expect(bar).toHaveJSProperty('value', 7);
  assert.equal(await spinner!.evaluate((node) => node.isConnected), true);
  await expect(page.locator('#clustering progress')).toHaveCount(1);
  release();
  await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
  await expect(page.locator('#clusters progress')).toHaveCount(0);
});

browserTest('trying again: the repositories’ bar while the organization is scanned again, then the skills’ in its place', async (t) => {
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  let asked = 0;
  const page = await organizationPage(t, async () => (asked++ ? (await gate, ANSWER) : Promise.reject(new Error('busy'))));
  await expect(page.locator('#clusters .error')).toHaveText('Unexpected error: busy');
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.getByRole('progressbar', { name: 'Skills clustered' })).toHaveJSProperty('max', 7);
  await expect(page.locator('#clustering progress')).toHaveCount(1);
  release();
  await expect(page.locator('#clusters .theme')).toHaveCount(3);
});

const headings = (page: Page) => page.locator('#clusters .theme h3 button');

browserTest('each cluster collapsed by default: its theme and pill a button, ▸, its skills hidden', async (t) => {
  const page = await organizationPage(t, async () => ANSWER);
  await expect(headings(page)).toHaveText(['Build4 skills', 'Review2 skills', 'Releases1 skill']);
  assert.deepEqual(await headings(page).evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-expanded'))), ['false', 'false', 'false']);
  assert.equal(await headings(page).first().evaluate((button) => button.ownerDocument.defaultView!.getComputedStyle(button, '::before').content), '"▸ "');
  await expect(page.locator('#clusters .theme li:visible')).toHaveCount(0);
});

browserTest('a cluster’s button shows its skills, and hides them again', async (t) => {
  const page = await organizationPage(t, async () => ANSWER);
  await headings(page).nth(1).click();
  await expect(headings(page).nth(1)).toHaveAttribute('aria-expanded', 'true');
  assert.equal(await headings(page).nth(1).evaluate((button) => button.ownerDocument.defaultView!.getComputedStyle(button, '::before').content), '"▾ "');
  await expect(page.locator('#clusters .theme li:visible')).toHaveText(['cJetBrains/ideaRun the c.', 'reviewJetBrains/androidRun the review.']);
  await expect(page.getByRole('link', { name: 'review', exact: true })).toHaveAttribute('href', REVIEW.link);
  await headings(page).nth(1).click();
  await expect(headings(page).nth(1)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#clusters .theme li:visible')).toHaveCount(0);
});

browserTest('each new answer comes collapsed', async (t) => {
  const page = await organizationPage(t, async () => ANSWER);
  await headings(page).first().click();
  await expect(headings(page).first()).toHaveAttribute('aria-expanded', 'true');
  await page.getByLabel('Repository or organization link').fill('JetBrains');
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(headings(page)).toHaveText(['Build4 skills', 'Review2 skills', 'Releases1 skill']);
  await expect(headings(page).first()).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#clusters .theme li:visible')).toHaveCount(0);
});

browserTest('the model’s warnings go under the header, hidden by default, as the scan’s', async (t) => {
  const page = await organizationPage(t, async () => clusters([['Build', [1, 2, 3, 4, 5, 6]]]));
  await expect(page.locator('#clusters .theme h3')).toHaveText(['Build6 skills', 'Other1 skill']);
  await expect(page.locator('#warnings li')).toHaveText(['warning: the model left out review; in Other']);
  await expect(page.locator('#warnings-toggle')).toHaveText('⚠ 1 warning');
  await expect(page.locator('#warnings')).toBeHidden();
});

browserTest('the clustering’s warnings change the count, not whether they are shown', async (t) => {
  const repositories = { tools: { '.claude/skills/x/SKILL.md': '---\nname: [x\n---\n', '.claude/skills/y/SKILL.md': skill('y') } };
  let asked = 0;
  const page = await organizationPage(t, async () => (asked++ ? clusters([['Tools', [2]]]) : Promise.reject(new Error('busy'))), repositories);
  const toggle = page.locator('#warnings-toggle');
  await expect(page.locator('#clusters .error')).toHaveText('Unexpected error: busy');
  await expect(toggle).toHaveText('⚠ 1 warning');
  await toggle.click();
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.locator('#clusters .theme h3')).toHaveText(['Tools1 skill', 'Other1 skill']);
  await expect(toggle).toHaveText('⚠ 2 warnings');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#warnings li')).toHaveText([/malformed front matter/, 'warning: the model left out x; in Other']);
  await expect(page.locator('#warnings li').last()).toBeVisible();
});

browserTest('a failure → the clear message, in the error color, and Cluster skills to try again', async (t) => {
  const page = await organizationPage(t, (prompt) => askClaude(prompt, { binary: NO_CLAUDE }));
  await expect(page.locator('#clusters .error')).toHaveText(
    `Cannot run ${NO_CLAUDE}: clustering needs Claude Code (claude) on the PATH, or CLAUDE set to it`,
  );
  // --error, light: #c0392b, not the summary's muted grey.
  await expect(page.locator('#clusters .error')).toHaveCSS('color', 'rgb(192, 57, 43)');
  await expect(page.getByRole('button', { name: 'Cluster skills' })).toBeEnabled();
});

browserTest('trying again: the organization scanned again, its progress under the button, the button disabled; then the clusters, the button hidden', async (t) => {
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  let asked = 0;
  const page = await organizationPage(t, async () => (asked++ ? (await gate, ANSWER) : Promise.reject(new Error('busy'))));
  await expect(page.locator('#clusters .error')).toHaveText('Unexpected error: busy');
  const before = scans;
  await page.getByRole('button', { name: 'Cluster skills' }).click();
  await expect(page.getByRole('button', { name: 'Clustering…' })).toBeDisabled();
  await expect(page.locator('#clusters')).toHaveText('Clustering 7 skills with haiku…');
  assert.equal(scans - before, 1);
  release();
  await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
  await expect(page.getByRole('button', { name: /Cluster skills|Clustering…/ })).toBeHidden();
  // The list still the first scan's.
  await expect(page.locator('#skills .name')).toHaveText(['JetBrains/idea', 'JetBrains/android', 'JetBrains/kotlin']);
});

/** A model that waits for `release`; `asked` once it is asked, `answered` once it answers, `signal` what it was given. */
function gated() {
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();
  const { promise: asked, resolve: ask } = Promise.withResolvers<AbortSignal | undefined>();
  const { promise: answered, resolve: answer } = Promise.withResolvers<void>();
  const model: Ask = async (prompt, signal) => (ask(signal), await gate, setTimeout(answer, 300), ANSWER);
  return { model, release, asked, answered };
}

browserTest('home, while clustering, drops the answer and stops the model', async (t) => {
  const { model, release, asked, answered } = gated();
  const page = await organizationPage(t, model);
  const signal = await asked;
  await page.locator('#home').click();
  await until(() => signal!.aborted);
  assert.equal(signal!.aborted, true);
  release();
  await answered;
  await expect(page.locator('#skills')).toHaveText('Paste a repository or an organization and press Scan.');
  await expect(page.locator('#detail')).toBeEmpty();
});

browserTest('a new scan, while clustering, drops the answer and stops the model', async (t) => {
  const { model, release, asked, answered } = gated();
  const page = await organizationPage(t, model);
  const signal = await asked;
  await page.getByLabel('Repository or organization link').fill('JetBrains/kotlin');
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(page.locator('#skills .message.error')).toHaveText('Unexpected error: not scanned');
  await until(() => signal!.aborted);
  assert.equal(signal!.aborted, true);
  release();
  await answered;
  await page.waitForTimeout(250); // the page has had the time to show an answer, and must not
  await expect(page.locator('#clusters')).toHaveCount(0);
  await expect(page.locator('#detail')).toBeEmpty();
});

browserTest('no skills → no clusters, no Cluster skills button, the model not asked', async (t) => {
  let asked = 0;
  const base = await serve(t, async () => (asked++, ANSWER), { website: { 'README.md': '# website\n' } });
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?org=JetBrains`);
  await expect(page.locator('#skills')).toHaveText('No SKILL.md in any of JetBrains’s 1 repository.');
  await expect(page.getByRole('button', { name: 'Cluster skills' })).toHaveCount(0);
  await expect(page.locator('#clusters')).toHaveCount(0);
  assert.equal(asked, 0);
});

browserTest('375 px, a long skill name in an open cluster: its name and repository cut with …, no sideways scroll', async (t) => {
  const repositories = {
    'kotlin-multiplatform-gradle-plugin': { '.claude/skills/kotlin-multiplatform-gradle-plugin-release/SKILL.md': skill('kotlin-multiplatform-gradle-plugin-release') },
    idea: { '.agents/skills/commits/SKILL.md': skill('commits') },
  };
  const base = await serve(t, async () => clusters([['Git', [1, 2]]]), repositories);
  const page = await browser!.newPage({ viewport: { width: 375, height: 720 } });
  t.after(() => page.close());
  await page.goto(`${base}/?org=JetBrains`);
  await headings(page).first().click();
  const rows = page.locator('#clusters .theme li');
  await expect(rows).toHaveCount(2);
  for (const part of ['a', '.in', '.description']) {
    for (const box of await rows.locator(part).evaluateAll((all) => all.map((element) => element.getBoundingClientRect().toJSON()))) {
      assert.ok(box.left >= 0 && box.right <= 375, `${part} inside the window: ${box.left}–${box.right}`);
    }
  }
  const name = rows.getByRole('link', { name: 'kotlin-multiplatform-gradle-plugin-release' });
  assert.equal(await name.evaluate((link) => link.scrollWidth > link.clientWidth), true, 'the name cut');
  assert.equal(await name.evaluate((link) => link.ownerDocument.defaultView!.getComputedStyle(link).textOverflow), 'ellipsis');
  assert.equal(await page.evaluate('document.documentElement.scrollWidth'), 375, 'no sideways scroll');
  assert.equal(await page.evaluate('document.body.scrollWidth'), 375, 'no sideways scroll');
});
