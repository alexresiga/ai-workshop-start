// Runs the commands the way the CLI does, with GitHub answering from EXAMPLE below; and scans small
// repositories written for a test, as a local directory and through GitHub.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../src/commands.ts';
import { openGitHub, parseGitHubUrl, type Fetch } from '../src/core/github.ts';
import { scanOrganization } from '../src/core/organization.ts';
import { replay, type Recording } from '../src/core/replay.ts';
import { scan, type ScanResult } from '../src/core/scan.ts';
import { openDirectory } from '../src/local.ts';

export const FIXTURE = fileURLToPath(new URL('../fixture', import.meta.url));
/** This repository: its own fixture is not a skill. */
export const REPOSITORY = fileURLToPath(new URL('..', import.meta.url));
export const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

/** The commit GitHub answers for JetBrains/example. */
export const EXAMPLE_COMMIT = '5ab6270ab772d113e8ad52ebfcaa0109c522ae00';

/** What GitHub answers for a small repository, JetBrains/example, with one skill. */
const EXAMPLE: Recording = {
  'https://api.github.com/repos/JetBrains/example': { status: 200, body: { full_name: 'JetBrains/example', default_branch: 'main' } },
  'https://api.github.com/repos/JetBrains/example/commits/main': { status: 200, body: { sha: EXAMPLE_COMMIT } },
  'https://api.github.com/search/code?q=filename:SKILL.md+repo:JetBrains/example&per_page=100&page=1': {
    status: 200,
    body: { total_count: 1, items: [{ path: '.claude/skills/commits/SKILL.md' }] },
  },
  [`https://raw.githubusercontent.com/JetBrains/example/${EXAMPLE_COMMIT}/.claude/skills/commits/SKILL.md`]: {
    status: 200,
    body: '---\nname: commits\ndescription: Write commit messages the way this repository does. Use for every commit.\n---\n# Commits\n',
  },
};

/** GitHub, answering from EXAMPLE. */
export const github = replay(EXAMPLE);

/** Retries go at once in tests. */
export const noWait = async () => {};

/** `skill-atlas <args>`, as the CLI runs it, with GitHub answering from EXAMPLE, or from `fetch`; with a token, or without. */
export async function atlas(args: string[], fetch: Fetch = github, withToken = true) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const options = { fetch, token: withToken ? 'test' : undefined, wait: noWait };
  const code = await run(args, {
    // With a token, through code search, as EXAMPLE answers it.
    open: (input) => (parseGitHubUrl(input) ? openGitHub(input, options) : openDirectory(input)),
    organization: (input) => scanOrganization(input, options),
    print: (text) => stdout.push(text),
    error: (text) => stderr.push(text),
  });
  return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
}

/** A repository written for a test: each file's path and text. */
export type Files = Record<string, string>;

/** A SKILL.md with a name and a description. */
export const skill = (name: string) => `---\nname: ${name}\ndescription: Run the ${name}.\n---\n# ${name}\n`;

/** The files in a new directory, removed after the test. */
export function directory(t: { after(fn: () => void): void }, files: Files): string {
  const root = join(mkdtempSync(join(tmpdir(), 'skill-atlas-')), 'repo');
  t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

/** What GitHub answers for the files, through code search. */
export function searchAnswers(id: string, files: Files): Recording {
  const skills = Object.keys(files).filter((path) => path.split('/').at(-1) === 'SKILL.md');
  const recording: Recording = {
    [`https://api.github.com/repos/${id}`]: { status: 200, body: { full_name: id, default_branch: 'main' } },
    [`https://api.github.com/repos/${id}/commits/main`]: { status: 200, body: { sha: COMMIT } },
    [`https://api.github.com/search/code?q=filename:SKILL.md+repo:${id}&per_page=100&page=1`]: {
      status: 200,
      body: { total_count: skills.length, items: skills.map((path) => ({ path })) },
    },
  };
  for (const [path, text] of Object.entries(files)) {
    recording[`https://raw.githubusercontent.com/${id}/${COMMIT}/${path}`] = { status: 200, body: text };
  }
  return recording;
}

/** Each skill as its path, name and copies; and the warnings. */
export type Summary = { skills: [string, string, string[]][]; warnings: string[] };

const summary = ({ skills, warnings }: ScanResult): Summary => ({
  skills: skills.map((skill) => [skill.path, skill.name, skill.copies]),
  warnings,
});

/** The files scanned as a local directory and through GitHub: both must find the same. */
export async function scanBothWays(t: { after(fn: () => void): void }, files: Files): Promise<{ local: Summary; github: Summary }> {
  const id = 'example/repo';
  return {
    local: summary(await scan(await openDirectory(directory(t, files)))),
    github: summary(await scan(await openGitHub(`https://github.com/${id}`, { fetch: replay(searchAnswers(id, files)), token: 't' }))),
  };
}

/** An organization's repository: its files; a fork; or an empty one, with no commits. */
export type Listed = Files | 'fork' | 'empty';

const API = 'https://api.github.com';

/** The UTC time `/rate_limit` answers the limit resets at: 14:05. */
export const RESET = Date.UTC(2026, 9, 20, 14, 5) / 1000;

/**
 * What GitHub answers for an account and its repositories, each on its default branch, `main`: the account, the listing, one code
 * search for the whole account, each repository's tree and files at `main`, and the rate limit.
 */
export function organizationAnswers(
  login: string,
  type: 'Organization' | 'User',
  repositories: Record<string, Listed>,
  { publicRepos = Object.keys(repositories).length, remaining = 5000 } = {},
): Recording {
  const names = Object.keys(repositories);
  const pages = Math.max(1, Math.ceil(names.length / 100));
  const recording: Recording = {
    [`${API}/users/${login}`]: { status: 200, body: { login, type, public_repos: publicRepos } },
    [`${API}/rate_limit`]: { status: 200, body: { resources: { core: { remaining, reset: RESET }, search: { remaining: 30, reset: RESET } } } },
  };
  for (let page = 1; page <= pages; page++) {
    const url =
      type === 'Organization'
        ? `${API}/orgs/${login}/repos?type=all&per_page=100&page=${page}`
        : `${API}/users/${login}/repos?type=owner&per_page=100&page=${page}`;
    recording[url] = {
      status: 200,
      body: names.slice((page - 1) * 100, page * 100).map((name) => ({
        full_name: `${login}/${name}`,
        default_branch: 'main',
        fork: repositories[name] === 'fork',
        private: false,
      })),
    };
  }
  const items: { path: string; repository: { full_name: string } }[] = [];
  for (const [name, listed] of Object.entries(repositories)) {
    const id = `${login}/${name}`;
    if (listed === 'empty') {
      recording[`${API}/repos/${id}/git/trees/main?recursive=1`] = { status: 409, body: { message: 'Git Repository is empty.' } };
      continue;
    }
    // A fork's own skills: the search and the listing find them, the scan leaves them out.
    const files = listed === 'fork' ? { '.claude/skills/forked/SKILL.md': skill('forked') } : listed;
    const tree = Object.keys(files).map((path) => ({ path, mode: '100644', type: 'blob', sha: '0' }));
    recording[`${API}/repos/${id}/git/trees/main?recursive=1`] = { status: 200, body: { truncated: false, tree } };
    for (const [path, text] of Object.entries(files)) {
      recording[`https://raw.githubusercontent.com/${id}/main/${path}`] = { status: 200, body: text };
      if (path.split('/').at(-1) === 'SKILL.md') items.push({ path, repository: { full_name: id } });
    }
  }
  const qualifier = type === 'Organization' ? 'org' : 'user';
  for (let page = 1; page <= Math.max(1, Math.ceil(items.length / 100)); page++) {
    recording[`${API}/search/code?q=filename:SKILL.md+${qualifier}:${login}&per_page=100&page=${page}`] = {
      status: 200,
      body: { total_count: items.length, incomplete_results: false, items: items.slice((page - 1) * 100, page * 100) },
    };
  }
  return recording;
}

/**
 * JetBrains, as the organization tests see it: skills counted as on their own, copies once, a
 * fixture not at all; a fork left out; a repository with no SKILL.md.
 */
export const ORGANIZATION: Record<string, Listed> = {
  kotlin: {
    '.agents/skills/build/SKILL.md': skill('build'),
    '.claude/skills/build/SKILL.md': skill('build'), // a copy
    '.claude/skills/release/SKILL.md': skill('release'),
    'fixture/skills/sample/SKILL.md': skill('sample'), // a fixture
    'README.md': '# kotlin\n',
  },
  android: { 'agent/skills/lint/SKILL.md': skill('lint'), '.claude/skills/review/SKILL.md': skill('review') },
  idea: { '.agents/skills/a/SKILL.md': skill('a'), '.agents/skills/b/SKILL.md': skill('b'), 'docs/c/SKILL.md': skill('c') },
  'test-data-only': { 'testData/skill/SKILL.md': skill('test') },
  website: { 'README.md': '# website\n' },
  'kotlin-fork': 'fork',
};

/** What the CLI prints for ORGANIZATION. */
export const ORGANIZATION_OUTPUT = [
  'JetBrains · 7 skills in 3 of 5 repositories',
  'JetBrains/idea · 3 skills',
  '  https://github.com/JetBrains/idea',
  'JetBrains/android · 2 skills',
  '  https://github.com/JetBrains/android',
  'JetBrains/kotlin · 2 skills',
  '  https://github.com/JetBrains/kotlin',
].join('\n');
