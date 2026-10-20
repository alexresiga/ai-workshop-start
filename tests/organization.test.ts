// "An organization" in spec/analysis.md and spec/cli.md, and the organization in spec/web.md: each
// repository of an account, scanned as on its own, counted by repository. GitHub answers from
// recordings written for each test, in tests/helpers.ts.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { openGitHub, openOrganization, type Fetch } from '../src/core/github.ts';
import type { Recording } from '../src/core/replay.ts';
import { createWebServer, type OrganizationAnswer } from '../src/web.ts';
import { accountAnswers, atlas, recorded, skill, type Files } from './helpers.ts';

/** JetBrains: two repositories with skills, one with none, one with only a fixture. */
const JETBRAINS: Record<string, Files> = {
  'JetBrains/kotlin': {
    '.agents/skills/bump/SKILL.md': skill('bump'),
    '.claude/skills/bump/SKILL.md': skill('bump'), // a copy: one skill
    '.claude/skills/pick/SKILL.md': skill('pick'),
    'README.md': '# Kotlin\n',
  },
  'JetBrains/android': { 'agent/skills/writing-lint-checks/SKILL.md': skill('writing-lint-checks') },
  'JetBrains/MPS': { 'README.md': '# MPS\n' },
  'JetBrains/tools': { 'fixture/.claude/skills/x/SKILL.md': skill('x') }, // not a skill
};

const JETBRAINS_OUTPUT = [
  'JetBrains · 3 skills in 2 of 4 repositories',
  'JetBrains/kotlin · 2 skills',
  '  https://github.com/JetBrains/kotlin',
  'JetBrains/android · 1 skill',
  '  https://github.com/JetBrains/android',
].join('\n');

test('scan an organization: the skills of each repository, counted as on their own, the most first', async () => {
  const { fetch, asked } = recorded(accountAnswers('JetBrains', 'Organization', JETBRAINS));
  const result = await atlas(['scan', 'https://github.com/JetBrains'], { fetch });
  assert.deepEqual(result, { code: 0, stdout: JETBRAINS_OUTPUT, stderr: '' });
  // One code search for the whole organization; a repository it finds no SKILL.md in is not opened.
  assert.equal(asked.filter((url) => url.includes('/search/code')).length, 1);
  assert.ok(!asked.some((url) => url.includes('/repos/JetBrains/MPS/')), asked.join('\n'));
  // The same count as scanning the repository on its own.
  const kotlin = await atlas(['scan', 'https://github.com/JetBrains/kotlin'], { fetch });
  assert.match(kotlin.stdout, /^JetBrains\/kotlin · 2 skills\n/);
});

test('scan an organization without a token: each repository’s tree, the same count', async () => {
  const { fetch, asked } = recorded(accountAnswers('JetBrains', 'Organization', JETBRAINS));
  const result = await atlas(['scan', 'github.com/JetBrains/'], { fetch, token: '' });
  assert.deepEqual(result, { code: 0, stdout: JETBRAINS_OUTPUT, stderr: '' });
  assert.ok(!asked.some((url) => url.includes('/search/code')));
});

test('a fork: code search leaves it out, so its tree, with a token too; on its own and in its organization', async () => {
  const fork = { 'JetBrains/fork': { '.agents/skills/a/SKILL.md': skill('a'), '.claude/skills/b/SKILL.md': skill('b') } };
  const { fetch, asked } = recorded(accountAnswers('JetBrains', 'Organization', { ...JETBRAINS, ...fork }, ['JetBrains/fork']));
  const result = await atlas(['scan', 'https://github.com/JetBrains'], { fetch });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /^JetBrains · 5 skills in 3 of 5 repositories\nJetBrains\/fork · 2 skills\n/);
  assert.ok(!asked.some((url) => url.includes('repo:JetBrains/fork')));
  assert.match((await atlas(['scan', 'https://github.com/JetBrains/fork'], { fetch })).stdout, /^JetBrains\/fork · 2 skills\n/);
});

test('scan a user’s account: their repositories, a user: search', async () => {
  const { fetch } = recorded(accountAnswers('alice', 'User', { 'alice/dotfiles': { '.claude/skills/commits/SKILL.md': skill('commits') } }));
  const result = await atlas(['scan', 'https://github.com/alice'], { fetch });
  assert.deepEqual(result, {
    code: 0,
    stdout: ['alice · 1 skill in 1 of 1 repository', 'alice/dotfiles · 1 skill', '  https://github.com/alice/dotfiles'].join('\n'),
    stderr: '',
  });
});

test('an organization without skills: none in any repository; more than 100 repositories, page by page', async () => {
  const many = Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`empty-org/repo-${i}`, { 'README.md': '#\n' }]));
  const recording = accountAnswers('empty-org', 'Organization', many);
  const list = (page: number) => `https://api.github.com/orgs/empty-org/repos?per_page=100&page=${page}`;
  const all = recording[list(1)].body as unknown[];
  recording[list(1)] = { status: 200, body: all.slice(0, 100) };
  recording[list(2)] = { status: 200, body: all.slice(100) };
  const result = await atlas(['scan', 'https://github.com/empty-org'], { fetch: recorded(recording).fetch });
  assert.deepEqual(result, { code: 0, stdout: 'empty-org · 0 skills in 0 of 101 repositories', stderr: '' });
});

test('more SKILL.md files than one search returns: each repository searched on its own', async () => {
  const recording = accountAnswers('JetBrains', 'Organization', JETBRAINS);
  recording['https://api.github.com/search/code?q=filename:SKILL.md+org:JetBrains&per_page=100&page=1'] = {
    status: 200,
    body: { total_count: 1500, items: Array.from({ length: 100 }, (_, i) => ({ path: `${i}/SKILL.md`, repository: { full_name: 'JetBrains/kotlin' } })) },
  };
  const { fetch, asked } = recorded(recording);
  const result = await atlas(['scan', 'https://github.com/JetBrains'], { fetch });
  assert.deepEqual(result, { code: 0, stdout: JETBRAINS_OUTPUT, stderr: '' });
  // The first page tells: the other nine are not asked for, searches are few a minute.
  assert.equal(asked.filter((url) => url.includes('+org:JetBrains')).length, 1);
  assert.ok(asked.includes('https://api.github.com/search/code?q=filename:SKILL.md+repo:JetBrains/MPS&per_page=100&page=1'));
});

test('a repository that cannot be scanned, an empty one: a warning, and the scan goes on', async () => {
  const recording = accountAnswers('JetBrains', 'Organization', { ...JETBRAINS, 'JetBrains/empty': {} });
  recording['https://api.github.com/repos/JetBrains/empty/commits/main'] = { status: 409, body: { message: 'Git Repository is empty.' } };
  const result = await atlas(['scan', 'https://github.com/JetBrains'], { fetch: recorded(recording).fetch, token: '' });
  assert.equal(result.code, 0);
  assert.equal(result.stdout, JETBRAINS_OUTPUT.replace('of 4 repositories', 'of 5 repositories'));
  assert.equal(result.stderr, 'warning: JetBrains/empty: the repository is empty; skipped');
});

test('with a token, a repository the search finds no SKILL.md in is not opened: an empty one, no warning', async () => {
  const recording = accountAnswers('JetBrains', 'Organization', { ...JETBRAINS, 'JetBrains/empty': {} });
  recording['https://api.github.com/repos/JetBrains/empty/commits/main'] = { status: 409, body: { message: 'Git Repository is empty.' } };
  const result = await atlas(['scan', 'https://github.com/JetBrains'], { fetch: recorded(recording).fetch });
  assert.deepEqual(result, { code: 0, stdout: JETBRAINS_OUTPUT.replace('of 4 repositories', 'of 5 repositories'), stderr: '' });
});

test('16 repositories at a time, not all at once', async () => {
  const many = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`JetBrains/repo-${i}`, { [`.claude/skills/s${i}/SKILL.md`]: skill(`s${i}`) }]));
  const answer = recorded(accountAnswers('JetBrains', 'Organization', many)).fetch;
  let open = 0;
  let most = 0;
  const fetch: typeof answer = async (url, init) => {
    most = Math.max(most, ++open);
    await new Promise((resolve) => setTimeout(resolve, 2));
    open--;
    return answer(url, init);
  };
  const result = await atlas(['scan', 'https://github.com/JetBrains'], { fetch, token: '' });
  assert.match(result.stdout, /^JetBrains · 40 skills in 40 of 40 repositories\n/);
  assert.ok(most > 4 && most <= 16, `at most ${most} requests at once`);
});

/** A fetch that answers after a while, and the most URLs asked for at once. */
function slow(answer: Fetch): { fetch: Fetch; most: (part: string) => number } {
  const open = new Map<string, number>();
  const most = new Map<string, number>();
  const part = (url: string) => url.replace(/&page=\d+/, '');
  return {
    fetch: async (url, init) => {
      open.set(part(url), (open.get(part(url)) ?? 0) + 1);
      most.set(part(url), Math.max(most.get(part(url)) ?? 0, open.get(part(url))!));
      await new Promise((resolve) => setTimeout(resolve, 2));
      open.set(part(url), open.get(part(url))! - 1);
      return answer(url, init);
    },
    most: (url) => most.get(part(url)) ?? 0,
  };
}

test('the pages of repositories the account counts, at once; then the next one while a page is full', async () => {
  const many = Object.fromEntries(Array.from({ length: 301 }, (_, i) => [`empty-org/repo-${i}`, { 'README.md': '#\n' }]));
  const recording = accountAnswers('empty-org', 'Organization', many);
  recording['https://api.github.com/users/empty-org'] = { status: 200, body: { login: 'empty-org', type: 'Organization', public_repos: 250 } };
  const list = (page: number) => `https://api.github.com/orgs/empty-org/repos?per_page=100&page=${page}`;
  const all = recording[list(1)].body as unknown[];
  for (let page = 1; page <= 4; page++) recording[list(page)] = { status: 200, body: all.slice((page - 1) * 100, page * 100) };
  const { fetch, most } = slow(recorded(recording).fetch);
  const result = await atlas(['scan', 'https://github.com/empty-org'], { fetch });
  assert.deepEqual(result, { code: 0, stdout: 'empty-org · 0 skills in 0 of 301 repositories', stderr: '' });
  assert.equal(most(list(1)), 3); // pages 1 to 3 at once; 4, the private ones past the count, after
});

test('warnings: each one led by its repository', async () => {
  const { fetch } = recorded(accountAnswers('JetBrains', 'Organization', { 'JetBrains/a': { '.claude/skills/x/SKILL.md': '---\nname: [x\n---\n' } }));
  const result = await atlas(['scan', 'https://github.com/JetBrains'], { fetch });
  assert.equal(result.code, 0);
  assert.match(result.stderr, /^warning: JetBrains\/a: \.claude\/skills\/x\/SKILL\.md: malformed front matter: /);
});

test('an organization that does not exist → a clear message, exit code 1', async () => {
  const { fetch } = recorded({ 'https://api.github.com/users/nobody': { status: 404, body: { message: 'Not Found' } } });
  assert.deepEqual(await atlas(['scan', 'https://github.com/nobody'], { fetch }), {
    code: 1,
    stdout: '',
    stderr: 'Organization not found: https://github.com/nobody',
  });
});

test('the rate limit, in any repository → the scan stops with the message, exit code 1', async () => {
  const recording = accountAnswers('JetBrains', 'Organization', JETBRAINS);
  recording['https://api.github.com/repos/JetBrains/android/commits/main'] = { status: 403, body: { message: 'API rate limit exceeded' } };
  assert.deepEqual(await atlas(['scan', 'https://github.com/JetBrains'], { fetch: recorded(recording).fetch, token: '' }), {
    code: 1,
    stdout: '',
    stderr: 'GitHub rate limit reached; set GITHUB_TOKEN',
  });
});

test('any 429, a search asked too often, say → the rate limit message, exit code 1', async () => {
  const recording = accountAnswers('JetBrains', 'Organization', JETBRAINS);
  recording['https://api.github.com/search/code?q=filename:SKILL.md+org:JetBrains&per_page=100&page=1'] = {
    status: 429,
    body: { message: 'try again in 13.5s' },
  };
  assert.deepEqual(await atlas(['scan', 'https://github.com/JetBrains'], { fetch: recorded(recording).fetch }), {
    code: 1,
    stdout: '',
    stderr: 'GitHub rate limit reached; try again in a minute',
  });
});

test('a rejected token, or GitHub out of reach, in any repository → the scan stops with the message, exit code 1', async () => {
  const rejected = accountAnswers('JetBrains', 'Organization', JETBRAINS);
  rejected['https://api.github.com/repos/JetBrains/android/commits/main'] = { status: 401, body: { message: 'Bad credentials' } };
  assert.deepEqual(await atlas(['scan', 'https://github.com/JetBrains'], { fetch: recorded(rejected).fetch }), {
    code: 1,
    stdout: '',
    stderr: 'GitHub rejected the token in GITHUB_TOKEN',
  });
  const unreachable = accountAnswers('JetBrains', 'Organization', JETBRAINS);
  delete unreachable['https://api.github.com/repos/JetBrains/android/commits/main'];
  assert.deepEqual(await atlas(['scan', 'https://github.com/JetBrains'], { fetch: recorded(unreachable).fetch }), {
    code: 1,
    stdout: '',
    stderr: 'Cannot reach GitHub: not recorded: https://api.github.com/repos/JetBrains/android/commits/main',
  });
});

test('github.com/<owner>/<repo> is still one repository', async () => {
  const { fetch } = recorded(accountAnswers('JetBrains', 'Organization', JETBRAINS));
  assert.match((await atlas(['scan', 'https://github.com/JetBrains/android'], { fetch })).stdout, /^JetBrains\/android · 1 skill\n/);
});

/** The web view, with GitHub answering from the recording. */
async function serve(t: { after(fn: () => void): void }, recording: Recording): Promise<string> {
  const { fetch } = recorded(recording);
  const server = createWebServer({
    open: (url) => openGitHub(url, { fetch, token: 't' }),
    openOrganization: (url) => openOrganization(url, { fetch, token: 't' }),
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

test('web: GET /api/organization → each repository with skills and its count', async (t) => {
  const base = await serve(t, accountAnswers('JetBrains', 'Organization', JETBRAINS));
  const expected: OrganizationAnswer = {
    organization: { id: 'JetBrains', url: 'https://github.com/JetBrains' },
    repositories: [
      { id: 'JetBrains/kotlin', url: 'https://github.com/JetBrains/kotlin', skills: 2 },
      { id: 'JetBrains/android', url: 'https://github.com/JetBrains/android', skills: 1 },
    ],
    scanned: 4,
    warnings: [],
  };
  for (const name of ['JetBrains', 'JetBrains/', 'https://github.com/JetBrains', ' github.com/JetBrains/ ']) {
    const response = await fetch(`${base}/api/organization?name=${encodeURIComponent(name)}`);
    assert.equal(response.status, 200, name);
    assert.deepEqual(await response.json(), expected, name);
  }
});

test('web: not an organization, or one that does not exist → status 400 and the clear message', async (t) => {
  const base = await serve(t, { 'https://api.github.com/users/nobody': { status: 404, body: { message: 'Not Found' } } });
  const answer = async (name: string) => {
    const response = await fetch(`${base}/api/organization?name=${encodeURIComponent(name)}`);
    return { status: response.status, body: await response.json() };
  };
  assert.deepEqual(await answer('nobody'), { status: 400, body: { error: 'Organization not found: https://github.com/nobody' } });
  for (const name of ['./fixture', 'JetBrains/kotlin', '/etc', '']) {
    assert.deepEqual(await answer(name), { status: 400, body: { error: `Not a GitHub organization: ${name}` } }, name);
  }
});

test('web: the page scans an organization, shows each repository and its count, and scans the one picked', async (t) => {
  const page = await (await fetch(`${await serve(t, {})}/`)).text();
  assert.match(page, /'\/api\/organization\?name='/);
  assert.match(page, /'\?org='/);
  assert.match(page, /function showOrganization\(answer\)/);
  assert.match(page, /'No SKILL\.md in any of its ' \+ count\(answer\.scanned, 'repository', 'repositories'\)/);
  assert.match(page, /count\(answer\.repositories\.length, 'repository', 'repositories'\) \+ ' of ' \+ answer\.scanned/);
  assert.match(page, /query\.get\('repo'\) \?\? query\.get\('org'\)/);
  assert.match(page, /history\.pushState\(null, '', '\?repo='/);
  assert.match(page, /addEventListener\('popstate'/);
  // Which input is an organization, as the page, a template literal, sends it to the browser.
  const organization = new RegExp(/const ORGANIZATION = \/(.*)\/i;/.exec(page)![1], 'i');
  for (const input of ['JetBrains', 'github.com/JetBrains', 'https://github.com/JetBrains/']) assert.ok(organization.test(input), input);
  for (const input of ['JetBrains/kotlin', 'https://github.com/JetBrains/kotlin', './fixture', '']) assert.ok(!organization.test(input), input);
});
