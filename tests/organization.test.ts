// spec/analysis.md and spec/cli.md, an organization: skills counted by repository, with GitHub
// answering from organizationAnswers in tests/helpers.ts, and the requests the scan makes recorded.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { openGitHub, type Fetch } from '../src/core/github.ts';
import { AT_ONCE, scanOrganization } from '../src/core/organization.ts';
import { replay, type Recording } from '../src/core/replay.ts';
import { atlas, noWait, ORGANIZATION, ORGANIZATION_OUTPUT, organizationAnswers, RESET, skill, type Listed } from './helpers.ts';

const API = 'https://api.github.com';
const SEARCH = `${API}/search/code?q=filename:SKILL.md+org:JetBrains&per_page=100&page=1`;

/** The fetch, and every URL it was asked for, in order. */
function recorded(recording: Recording, fallback?: Fetch) {
  const asked: string[] = [];
  const answer = replay(recording, fallback);
  const fetch: Fetch = (url, init) => {
    asked.push(url);
    return answer(url, init);
  };
  return { fetch, asked };
}

const jetbrains = (repositories: Record<string, Listed> = ORGANIZATION, options?: { publicRepos?: number; remaining?: number }) =>
  organizationAnswers('JetBrains', 'Organization', repositories, options);

test('an organization: its skills counted by repository, most first, then by name; forks left out', async () => {
  const { fetch, asked } = recorded(jetbrains());
  const scanned = await atlas(['scan', 'https://github.com/JetBrains'], fetch);
  assert.deepEqual(scanned, { code: 0, stdout: ORGANIZATION_OUTPUT, stderr: '' });
  // With a token, one search finds the SKILL.md files: no request per repository, and no tree.
  assert.deepEqual(asked.filter((url) => url.startsWith(API)).sort(), [
    `${API}/orgs/JetBrains/repos?type=all&per_page=100&page=1`,
    SEARCH,
    `${API}/users/JetBrains`,
  ]);
  assert.ok(!asked.some((url) => url.includes('/kotlin-fork/') || url.includes('/website/')));
});

test('an organization: github.com/<org> and a trailing slash are the same; github.com/<org>/<repo> is one repository', async () => {
  for (const url of ['github.com/JetBrains', 'https://github.com/JetBrains/', 'http://www.github.com/JetBrains']) {
    assert.equal((await atlas(['scan', url], replay(jetbrains()))).stdout, ORGANIZATION_OUTPUT, url);
  }
  assert.match((await atlas(['scan', 'https://github.com/JetBrains/example'])).stdout, /^JetBrains\/example · 1 skill\n/);
});

test('an organization without a token: the same counts, through each tree; an empty repository says nothing', async () => {
  const { fetch, asked } = recorded(jetbrains({ ...ORGANIZATION, empty: 'empty' }));
  const scanned = await atlas(['scan', 'https://github.com/JetBrains'], fetch, false);
  assert.deepEqual(scanned, { code: 0, stdout: ORGANIZATION_OUTPUT.replace('of 5', 'of 6'), stderr: '' });
  assert.ok(!asked.some((url) => url.includes('/search/')));
  assert.ok(asked.includes(`${API}/rate_limit`));
  // The listing names the default branch: one request per repository, its tree.
  assert.ok(!asked.includes(`${API}/repos/JetBrains/kotlin`));
  assert.ok(!asked.some((url) => url.includes('/commits/')));
});

test('an organization: a user account is searched and listed as a user', async () => {
  const recording = organizationAnswers('alex', 'User', { tools: { '.claude/skills/x/SKILL.md': skill('x') } });
  const scanned = await atlas(['scan', 'https://github.com/alex'], replay(recording));
  assert.deepEqual(scanned, { code: 0, stdout: 'alex · 1 skill in 1 of 1 repository\nalex/tools · 1 skill\n  https://github.com/alex/tools', stderr: '' });
});

test('an organization with no skills: zero, and no repository', async () => {
  const scanned = await atlas(['scan', 'https://github.com/JetBrains'], replay(jetbrains({ website: { 'README.md': '' } })));
  assert.deepEqual(scanned, { code: 0, stdout: 'JetBrains · 0 skills in 0 of 1 repository', stderr: '' });
});

test('an organization: not enough rate limit left for a tree per repository → stops before, with the numbers', async () => {
  const { fetch, asked } = recorded(jetbrains(ORGANIZATION, { remaining: 2 }));
  const scanned = await atlas(['scan', 'https://github.com/JetBrains'], fetch, false);
  assert.deepEqual(scanned, {
    code: 1,
    stdout: '',
    stderr: 'Scanning JetBrains needs 5 GitHub requests, and 2 are left until 14:05 UTC; set GITHUB_TOKEN',
  });
  assert.ok(!asked.some((url) => url.includes('/git/trees/')));
});

test('an organization: a tree too large for one answer → the limit checked again before its skill roots', async () => {
  const recording = jetbrains({ monorepo: {}, website: { 'README.md': '' } });
  const tree = (entries: [string, string, string][], truncated = false) => ({
    status: 200,
    body: { truncated, tree: entries.map(([path, type, sha]) => ({ path, mode: type === 'tree' ? '040000' : '100644', type, sha })) },
  });
  recording[`${API}/repos/JetBrains/monorepo/git/trees/main?recursive=1`] = tree([], true);
  recording[`${API}/repos/JetBrains/monorepo/git/trees/main`] = tree([['.claude', 'tree', 'claude']]);
  recording[`${API}/repos/JetBrains/monorepo/git/trees/claude`] = tree([['skills', 'tree', 'skills']]);
  recording[`${API}/repos/JetBrains/monorepo/git/trees/skills?recursive=1`] = tree([['big/SKILL.md', 'blob', '0']]);
  recording['https://raw.githubusercontent.com/JetBrains/monorepo/main/.claude/skills/big/SKILL.md'] = { status: 200, body: skill('big') };
  const enough = recording[`${API}/rate_limit`];
  const scanned = await atlas(['scan', 'https://github.com/JetBrains'], replay(recording), false);
  assert.equal(scanned.code, 0, scanned.stderr);
  assert.equal(scanned.stdout, 'JetBrains · 1 skill in 1 of 2 repositories\nJetBrains/monorepo · 1 skill\n  https://github.com/JetBrains/monorepo');
  // Enough for a tree each, not for the truncated tree's skill roots.
  const low = { status: 200, body: { resources: { core: { remaining: 3, reset: RESET } } } };
  recording[`${API}/rate_limit`] = [enough, low].flat();
  const { fetch, asked } = recorded(recording);
  const stopped = await atlas(['scan', 'https://github.com/JetBrains'], fetch, false);
  assert.equal(stopped.code, 1);
  assert.match(stopped.stderr, /^Scanning JetBrains needs 9 GitHub requests, and 3 are left until 14:05 UTC; set GITHUB_TOKEN$/);
  assert.ok(!asked.includes(`${API}/repos/JetBrains/monorepo/git/trees/main`));
});

test('an organization: more SKILL.md files than one search returns → its first page only, then each tree, not a search each', async () => {
  const recording = jetbrains();
  recording[SEARCH] = { status: 200, body: { total_count: 1500, incomplete_results: false, items: [] } };
  const { fetch, asked } = recorded(recording);
  const scanned = await atlas(['scan', 'https://github.com/JetBrains'], fetch);
  assert.deepEqual(scanned, { code: 0, stdout: ORGANIZATION_OUTPUT, stderr: '' });
  assert.deepEqual(asked.filter((url) => url.includes('/search/')), [SEARCH]);
  assert.ok(asked.includes(`${API}/repos/JetBrains/kotlin/git/trees/main?recursive=1`));
});

test('an organization: a search GitHub could not finish → each tree', async () => {
  const recording = jetbrains();
  recording[SEARCH] = { status: 200, body: { total_count: 3, incomplete_results: true, items: [] } };
  assert.equal((await atlas(['scan', 'https://github.com/JetBrains'], replay(recording))).stdout, ORGANIZATION_OUTPUT);
});

test('an organization: the pages its public count implies at once, then more while the last is full', async () => {
  const repositories: Record<string, Listed> = { tools: { '.claude/skills/x/SKILL.md': skill('x') } };
  for (let i = 0; i < 249; i++) repositories[`repo-${String(i).padStart(3, '0')}`] = {};
  const { fetch, asked } = recorded(jetbrains(repositories, { publicRepos: 150 }));
  const scanned = await scanOrganization('https://github.com/JetBrains', { fetch, token: 't' });
  assert.equal(scanned.scanned, 250);
  assert.deepEqual(scanned.repositories, [{ id: 'JetBrains/tools', url: 'https://github.com/JetBrains/tools', skills: 1 }]);
  const pages = asked.filter((url) => url.includes('/orgs/JetBrains/repos'));
  assert.deepEqual(pages.map((url) => url.at(-1)), ['1', '2', '3']);
});

test('an organization: a problem in one repository is a warning, prefixed with it; the scan goes on', async () => {
  const recording = jetbrains({ ...ORGANIZATION, broken: { '.claude/skills/x/SKILL.md': skill('x') }, odd: { 'odd/SKILL.md': '---\na: b: c\n---\n' } });
  recording['https://raw.githubusercontent.com/JetBrains/broken/main/.claude/skills/x/SKILL.md'] = { status: 500, body: '' };
  const scanned = await atlas(['scan', 'https://github.com/JetBrains'], replay(recording));
  assert.equal(scanned.code, 0);
  assert.equal(scanned.stdout.split('\n')[0], 'JetBrains · 8 skills in 4 of 7 repositories');
  assert.match(scanned.stdout, /^JetBrains\/odd · 1 skill$/m);
  assert.equal(
    scanned.stderr,
    [
      'warning: JetBrains/broken: GitHub answered 500 for https://raw.githubusercontent.com/JetBrains/broken/main/.claude/skills/x/SKILL.md; skipped',
      'warning: JetBrains/odd: odd/SKILL.md: malformed front matter: Nested mappings are not allowed in compact mappings at line 2, column 4; using the directory name',
    ].join('\n'),
  );
});

test('an organization: what every repository would hit stops the scan, exit code 1', async () => {
  const cases: [string, (recording: Recording) => void, string][] = [
    ['not found', (r) => (r[`${API}/users/JetBrains`] = { status: 404, body: { message: 'Not Found' } }), 'Organization not found: https://github.com/JetBrains'],
    ['a rejected token', (r) => (r[SEARCH] = { status: 401, body: { message: 'Bad credentials' } }), 'GitHub rejected the token in GITHUB_TOKEN'],
    [
      'the rate limit, reading a SKILL.md',
      (r) => (r['https://raw.githubusercontent.com/JetBrains/idea/main/docs/c/SKILL.md'] = { status: 429, body: '' }),
      'GitHub rate limit reached; try again in a minute',
    ],
    [
      'the rate limit, for an hour',
      (r) =>
        (r[SEARCH] = {
          status: 403,
          body: { message: 'API rate limit exceeded' },
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600) },
        }),
      'GitHub rate limit reached; try again after ',
    ],
  ];
  for (const [name, change, message] of cases) {
    const recording = jetbrains();
    change(recording);
    const scanned = await atlas(['scan', 'https://github.com/JetBrains'], replay(recording));
    assert.equal(scanned.code, 1, name);
    assert.equal(scanned.stdout, '', name);
    assert.ok(scanned.stderr.startsWith(message), `${name}: ${scanned.stderr}`);
  }
  const offline = await atlas(['scan', 'https://github.com/JetBrains'], replay({}));
  assert.deepEqual(offline, { code: 1, stdout: '', stderr: `Cannot reach GitHub: not recorded: ${API}/users/JetBrains` });
  // Out of reach after the listing: not a warning for each repository, and no count of nothing.
  const listed = replay(jetbrains());
  const gone: Fetch = (url, init) =>
    url.includes('/git/trees/') || url.startsWith('https://raw.githubusercontent.com/') ? Promise.reject(new TypeError('fetch failed')) : listed(url, init);
  const cut = await atlas(['scan', 'https://github.com/JetBrains'], gone, false);
  assert.equal(cut.code, 1);
  assert.equal(cut.stdout, '');
  assert.match(cut.stderr, /^Cannot reach GitHub: fetch failed$/);
});

test('the rate limit for a moment: waits as long as GitHub asks, once, then goes on', async () => {
  const recording = jetbrains();
  const answer = recording[SEARCH];
  recording[SEARCH] = [{ status: 403, body: { message: 'You have exceeded a secondary rate limit.' }, headers: { 'retry-after': '3' } }, answer].flat();
  const waits: number[] = [];
  const scanned = await scanOrganization('https://github.com/JetBrains', { fetch: replay(recording), token: 't', wait: async (ms) => void waits.push(ms) });
  assert.equal(scanned.repositories.length, 3);
  assert.deepEqual(waits, [3000]);
  // A primary limit that resets within a minute: waits until then.
  const reset = Math.floor(Date.now() / 1000) + 20;
  recording[SEARCH] = [{ status: 403, body: { message: 'API rate limit exceeded' }, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(reset) } }, answer].flat();
  waits.length = 0;
  await scanOrganization('https://github.com/JetBrains', { fetch: replay(recording), token: 't', wait: async (ms) => void waits.push(ms) });
  assert.equal(waits.length, 1);
  assert.ok(waits[0] > 15_000 && waits[0] <= 21_000, String(waits[0]));
  // Limited again after the wait: the message.
  recording[SEARCH] = { status: 429, body: '', headers: { 'retry-after': '3' } };
  await assert.rejects(scanOrganization('https://github.com/JetBrains', { fetch: replay(recording), token: 't', wait: noWait }), {
    message: 'GitHub rate limit reached; try again in a minute',
  });
});

test('a request that gets no answer is sent once more', async () => {
  const answer = replay(jetbrains());
  let failed = false;
  const flaky: Fetch = (url, init) => {
    if (!failed && url.includes('/raw.githubusercontent.com/JetBrains/kotlin/')) {
      failed = true;
      return Promise.reject(new TypeError('fetch failed'));
    }
    return answer(url, init);
  };
  assert.equal((await atlas(['scan', 'https://github.com/JetBrains'], flaky)).stdout, ORGANIZATION_OUTPUT);
  assert.ok(failed);
});

test(`an organization: at most ${AT_ONCE} requests to GitHub at a time`, async () => {
  const repositories: Record<string, Listed> = {};
  for (let i = 0; i < 60; i++) repositories[`repo-${i}`] = { '.claude/skills/x/SKILL.md': skill('x'), 'y/SKILL.md': skill('y') };
  const answer = replay(jetbrains(repositories));
  let running = 0;
  let most = 0;
  const slow: Fetch = async (url, init) => {
    most = Math.max(most, ++running);
    await new Promise((resolve) => setTimeout(resolve, 2));
    running--;
    return answer(url, init);
  };
  const scanned = await scanOrganization('https://github.com/JetBrains', { fetch: slow });
  assert.equal(scanned.repositories.length, 60);
  assert.equal(most, AT_ONCE);
});

test('a private repository: its SKILL.md files are read with the token', async () => {
  const headers: (Record<string, string> | undefined)[] = [];
  const answer = replay(jetbrains());
  const fetch: Fetch = (url, init) => {
    if (url.startsWith('https://raw.githubusercontent.com/')) headers.push(init?.headers);
    return answer(url, init);
  };
  await scanOrganization('https://github.com/JetBrains', { fetch, token: 'secret' });
  assert.ok(headers.length > 0);
  assert.ok(headers.every((header) => header?.Authorization === 'Bearer secret'));
});

test('an empty repository on its own → a clear message, exit code 1', async () => {
  const empty = replay({
    [`${API}/repos/JetBrains/empty`]: { status: 200, body: { full_name: 'JetBrains/empty', default_branch: 'main' } },
    [`${API}/repos/JetBrains/empty/commits/main`]: { status: 409, body: { message: 'Git Repository is empty.' } },
  });
  await assert.rejects(openGitHub('https://github.com/JetBrains/empty', { fetch: empty }), { message: 'Repository is empty: https://github.com/JetBrains/empty' });
});
