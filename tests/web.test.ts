// spec/web.md: the web view, served on a free port, with GitHub answering from tests/helpers.ts.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { createServer, type AddressInfo } from 'node:net';
import { test } from 'node:test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { AtlasError } from '../src/core/errors.ts';
import { createWebServer, listen, type ScanAnswer } from '../src/web.ts';
import { atlas, CLI, EXAMPLE_COMMIT, github, searchAnswers } from './helpers.ts';

const missing = replay({ 'https://api.github.com/repos/JetBrains/missing': { status: 404, body: { message: 'Not Found' } } }, github);
const server = createWebServer({ open: (url) => openGitHub(url, { fetch: missing, token: 'test' }) });
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

const scanFor = (url: string) => fetch(`${base}/api/scan?url=${encodeURIComponent(url)}`);

test('the page: an owner/repo or GitHub link input, a Scan button, the list and the SKILL.md', async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  const page = await response.text();
  assert.match(page, /<input id="url"[^>]*placeholder="owner\/repo or a GitHub link"[^>]*aria-label="Repository link"/);
  assert.match(page, /<button id="button" class="scan" type="submit">Scan<\/button>/);
  assert.match(page, /<nav id="skills"/);
  assert.match(page, /<section id="detail"/);
  assert.match(page, /Open on GitHub ↗/);
  assert.match(page, /import \{ markdown \} from '\/markdown.js'/);
  // A SKILL.md is text: the page never puts repository content in as HTML.
  assert.doesNotMatch(page, /innerHTML/);
});

test('scan: the repository, each skill with its link and its SKILL.md text', async () => {
  const response = await scanFor('https://github.com/JetBrains/example');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    repository: { id: 'JetBrains/example', url: 'https://github.com/JetBrains/example', commit: EXAMPLE_COMMIT },
    skills: [
      {
        name: 'commits',
        description: 'Write commit messages the way this repository does. Use for every commit.',
        path: '.claude/skills/commits/SKILL.md',
        link: `https://github.com/JetBrains/example/blob/${EXAMPLE_COMMIT}/.claude/skills/commits/SKILL.md`,
        copies: [],
        text: '---\nname: commits\ndescription: Write commit messages the way this repository does. Use for every commit.\n---\n# Commits\n',
        properties: {},
        body: '# Commits',
      },
    ],
    warnings: [],
  });
});

test('scan: owner/repo is short for the GitHub link', async () => {
  const response = await scanFor('JetBrains/example');
  assert.equal(response.status, 200);
  const answer = (await response.json()) as ScanAnswer;
  assert.equal(answer.repository.id, 'JetBrains/example');
  assert.deepEqual(answer.skills.map((skill) => skill.name), ['commits']);
});

test('scan: the other front matter keys and the body, apart', async (t) => {
  const text = '---\nname: pick\ndescription: Pick a fix.\ndisable-model-invocation: true\nallowed-tools: [Bash]\n---\n\n# Pick\n\nRun it.\n';
  const server = createWebServer({
    open: (url) => openGitHub(url, { fetch: replay(searchAnswers('example/repo', { '.claude/skills/pick/SKILL.md': text })), token: 't' }),
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/scan?url=example/repo`);
  const [skill] = ((await response.json()) as ScanAnswer).skills;
  assert.deepEqual(skill.properties, { 'disable-model-invocation': true, 'allowed-tools': ['Bash'] });
  assert.equal(skill.body, '# Pick\n\nRun it.');
  assert.equal(skill.text, text);
});

test('the page gets the Markdown parser, as JavaScript', async () => {
  const response = await fetch(`${base}/markdown.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/javascript/);
  assert.match(await response.text(), /export function markdown\(text\)/);
});

test('scan: an unreachable repository → status 400 and the clear message', async () => {
  const response = await scanFor('https://github.com/JetBrains/missing');
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Repository not found: https://github.com/JetBrains/missing' });
});

test('scan: GitHub repositories only, never the server’s own directories', async () => {
  for (const url of ['./fixture', '../repo', '/etc', '']) {
    const response = await scanFor(url);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: `Not a GitHub repository URL: ${url}` });
  }
});

test('the page: after a scan, a filter above the skills, with the filter module', async () => {
  const page = await (await fetch(`${base}/`)).text();
  assert.match(page, /<input id="filter" type="search"[^>]*aria-label="Filter skills"[^>]*hidden>/);
  assert.match(page, /import \{ matches \} from '\/filter.js'/);
  assert.match(page, /No skill matches /);
  assert.match(page, /' of ' \+ skills.length/);
  const response = await fetch(`${base}/filter.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/javascript/);
  assert.match(await response.text(), /export function matches\(skill, text\)/);
});

test('anything else → 404', async () => {
  assert.equal((await fetch(`${base}/nothing`)).status, 404);
});

test('serve: a port or nothing; not available without a server', async () => {
  assert.deepEqual(await atlas(['serve', 'abc']), { code: 1, stdout: '', stderr: 'Usage: skill-atlas serve [port]' });
  assert.deepEqual(await atlas(['serve']), { code: 1, stdout: '', stderr: 'serve: not available here' });
});

/** The status for a request with this Host header, or none; fetch cannot set one. */
function statusFor(host: string | undefined): Promise<number> {
  return new Promise((resolve, reject) => {
    const { port } = new URL(base);
    const headers = host === undefined ? {} : { host };
    request({ host: '127.0.0.1', port, path: '/api/scan?url=JetBrains/example', headers, setHost: false }, (response) => {
      response.resume();
      resolve(response.statusCode ?? 0);
    })
      .on('error', reject)
      .end();
  });
}

test('only a loopback Host: a page that rebinds its name to 127.0.0.1 gets 403', async () => {
  const { port } = new URL(base);
  for (const host of [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`, 'localhost']) assert.equal(await statusFor(host), 200, host);
  for (const host of [`evil.example.com:${port}`, 'evil.example.com', `127.0.0.1.evil.example.com:${port}`]) {
    assert.equal(await statusFor(host), 403, host);
  }
  // No Host at all: Node refuses it before the server sees it, as HTTP/1.1 requires one.
  assert.equal(await statusFor(undefined), 400);
});

test('serve: not a port → a clear message, exit code 1', async () => {
  assert.deepEqual(await atlas(['serve', '99999']), { code: 1, stdout: '', stderr: 'Not a port: 99999; a port is 0 to 65535' });
});

test('serve: a port already in use → a clear message, not a stack trace', async (t) => {
  const taken = createServer();
  await new Promise<void>((resolve) => taken.listen(0, '127.0.0.1', resolve));
  t.after(() => taken.close());
  const port = (taken.address() as AddressInfo).port;
  await assert.rejects(
    listen(createWebServer({ open: () => Promise.reject(new Error('not scanned')) }), port, () => {}),
    new AtlasError(`Port ${port} is already in use; try skill-atlas serve <another port>`),
  );
  // The real command, as a user runs it.
  const served = spawnSync(process.execPath, [CLI, 'serve', String(port)], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(served.status, 1);
  assert.equal(served.stderr.trim(), `Port ${port} is already in use; try skill-atlas serve <another port>`);
});
