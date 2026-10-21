// spec/web.md: the web view, served on a free port, with GitHub answering from tests/helpers.ts.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { request } from 'node:http';
import { createServer, type AddressInfo } from 'node:net';
import { test } from 'node:test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { AtlasError } from '../src/core/errors.ts';
import { createWebServer, listen, type OrganizationAnswer, type ScanAnswer } from '../src/web.ts';
import { scanOrganization } from '../src/core/organization.ts';
import { atlas, CLI, EXAMPLE_COMMIT, github, noWait, organizationAnswers, ORGANIZATION, searchAnswers } from './helpers.ts';

const missing = replay({ 'https://api.github.com/repos/JetBrains/missing': { status: 404, body: { message: 'Not Found' } } }, github);
const server = createWebServer({
  open: (url) => openGitHub(url, { fetch: missing, token: 'test', wait: noWait }),
  organization: (url, progress) =>
    scanOrganization(url, { fetch: replay(organizationAnswers('JetBrains', 'Organization', ORGANIZATION), missing), token: 'test' }, progress),
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

const scanFor = (url: string) => fetch(`${base}/api/scan?url=${encodeURIComponent(url)}`);

test('the page: an owner/repo, organization or GitHub link input, a Scan button, the list and the SKILL.md', async () => {
  const response = await fetch(`${base}/`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  const page = await response.text();
  assert.match(page, /<input id="url"[^>]*placeholder="owner\/repo, an organization or a GitHub link"[^>]*aria-label="Repository or organization link"/);
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
    organization: () => Promise.reject(new Error('not scanned')),
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

test('the page gets the named entities markdown.js reads, as JavaScript', async () => {
  const response = await fetch(`${base}/entities.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/javascript/);
  assert.match(await response.text(), /export const ENTITIES = /);
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

const organizationFor = (name: string) => fetch(`${base}/api/organization?name=${encodeURIComponent(name)}`);

test('organization: each repository with skills and its count, most first; how many were scanned; the warnings', async () => {
  const response = await organizationFor('JetBrains');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    organization: { id: 'JetBrains', url: 'https://github.com/JetBrains' },
    repositories: [
      { id: 'JetBrains/idea', url: 'https://github.com/JetBrains/idea', skills: 3 },
      { id: 'JetBrains/android', url: 'https://github.com/JetBrains/android', skills: 2 },
      { id: 'JetBrains/kotlin', url: 'https://github.com/JetBrains/kotlin', skills: 2 },
    ],
    scanned: 5,
    warnings: [],
  });
});

test('organization: org, org/ and the GitHub link are the same', async () => {
  for (const name of ['JetBrains/', 'github.com/JetBrains', 'https://github.com/JetBrains']) {
    const answer = (await (await organizationFor(name)).json()) as OrganizationAnswer;
    assert.equal(answer.organization.id, 'JetBrains', name);
    assert.equal(answer.repositories.length, 3, name);
  }
});

test('organization: not an organization → status 400 and the clear message', async () => {
  for (const name of ['JetBrains/kotlin', './fixture', '-x', '']) {
    const response = await organizationFor(name);
    assert.equal(response.status, 400, name);
    assert.deepEqual(await response.json(), { error: `Not a GitHub organization: ${name}` });
  }
  const missing = await organizationFor('nobody');
  assert.equal(missing.status, 400);
  assert.match(((await missing.json()) as { error: string }).error, /^Cannot reach GitHub: /);
});

const progressFor = (name: string) => fetch(`${base}/api/organization/progress?name=${encodeURIComponent(name)}`);
/** The lines of a streamed answer, each parsed. */
const lines = async (response: Response) => (await response.text()).split('\n').filter(Boolean).map((line) => JSON.parse(line));

test('organization progress: NDJSON, the progress from 0 once listed, then the answer of /api/organization last', async () => {
  const response = await progressFor('JetBrains');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /application\/x-ndjson/);
  const answer = await lines(response);
  assert.deepEqual(answer.slice(0, -1), [0, 1, 2, 3, 4, 5].map((scanned) => ({ progress: { scanned, of: 5 } })));
  assert.deepEqual(answer.at(-1), await (await organizationFor('JetBrains')).json());
});

test('organization progress: not an organization → status 400; a failure while it scans → { error }, last', async () => {
  const response = await progressFor('JetBrains/example/x');
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'Not a GitHub organization: JetBrains/example/x' });
  const missing = await progressFor('nobody');
  assert.equal(missing.status, 200);
  const answer = await lines(missing);
  assert.equal(answer.length, 1);
  assert.match(answer[0].error, /^Cannot reach GitHub: /);
});

test('the page: an organization lists its repositories with their counts; a repository scans it, Back returns', async () => {
  const page = await (await fetch(`${base}/`)).text();
  assert.match(page, /'\/api\/clusters\/progress\?name=' \+ encodeURIComponent\(name\)/);
  assert.match(page, /'\?org=' : '\?repo='/);
  assert.match(page, /setAttribute\('aria-label', 'Repositories'\)/);
  assert.match(page, /' of ' \+ plural\(answer.scanned, 'repository'\)/);
  assert.match(page, /Pick a repository to see its skills\./);
  assert.match(page, /No SKILL.md in any of /);
  assert.match(page, /scan\(repository.id, 'push', false\)/);
  assert.match(page, /addEventListener\('popstate', scanAddress\)/);
  // Only the latest scan's answer is shown, whichever comes back last.
  assert.match(page, /if \(mine !== latest\) return;/);
});

test('the page: a dice in the header, for a random skill from JetBrains/kotlin, with the random module', async () => {
  const page = await (await fetch(`${base}/`)).text();
  const header = page.slice(page.indexOf('<header>'), page.indexOf('</header>'));
  assert.match(header, /<button id="dice" class="dice" type="button"[^>]*aria-label="A random skill from JetBrains\/kotlin">🎲<\/button>/);
  assert.match(page, /import \{ DICE_REPOSITORY, pick \} from '\/random.js'/);
  // Scans JetBrains/kotlin unless it is on the page, empties the filter, and is disabled while a scan runs.
  assert.match(page, /await scan\(DICE_REPOSITORY, 'replace', false\)/);
  assert.match(page, /\$\('dice'\).disabled = true/);
  const response = await fetch(`${base}/random.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/javascript/);
  assert.match(await response.text(), /export function pick\(count, current = -1, random = Math.random\)/);
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
    listen(createWebServer({ open: () => Promise.reject(new Error('not scanned')), organization: () => Promise.reject(new Error('not scanned')) }), port, () => {}),
    new AtlasError(`Port ${port} is already in use; try skill-atlas serve <another port>`),
  );
  // The real command, as a user runs it.
  const served = spawnSync(process.execPath, [CLI, 'serve', String(port)], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(served.status, 1);
  assert.equal(served.stderr.trim(), `Port ${port} is already in use; try skill-atlas serve <another port>`);
});
