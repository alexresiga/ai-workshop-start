import { AtlasError, EmptyRepositoryError, GitHubError } from './errors.ts';
import { SKILL_ROOTS } from './find.ts';
import type { Source } from './scan.ts';

/** The part of `fetch` the core uses, so tests and the browser can pass their own. */
export type Fetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

export type GitHubOptions = {
  fetch: Fetch;
  /** With a token, skills are found through code search; without it, through the tree. */
  token?: string;
  /** Waits before a retry; setTimeout by default, so tests need not wait. */
  wait?: (ms: number) => Promise<void>;
};

export const API = 'https://api.github.com';
export const RAW = 'https://raw.githubusercontent.com';

/** The longest wait for GitHub's rate limit before one retry; past it, the scan stops with the message. */
const LONGEST_WAIT = 60_000;

/** `https://github.com/owner/repo`, with or without the scheme, a trailing slash or `.git`. */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | undefined {
  const match = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i.exec(input.trim());
  return match ? { owner: match[1], repo: match[2] } : undefined;
}

/** Resolves the default branch to a commit and lists the files that may be skills. */
export async function openGitHub(input: string, options: GitHubOptions): Promise<Source> {
  const name = parseGitHubUrl(input);
  if (!name) throw new AtlasError(`Not a GitHub repository URL: ${input}`);
  const github = client(options);
  const info = await github.json<{ full_name: string; default_branch: string }>(
    `${API}/repos/${name.owner}/${name.repo}`,
    `Repository not found: https://github.com/${name.owner}/${name.repo}`,
  );
  const id = info.full_name;
  const { sha } = await github
    .json<{ sha: string }>(`${API}/repos/${id}/commits/${encodePath(info.default_branch)}`)
    .catch((error) => {
      throw error instanceof EmptyRepositoryError ? new EmptyRepositoryError(`Repository is empty: https://github.com/${id}`) : error;
    });
  const warnings: string[] = [];
  const paths = options.token ? await searchPaths(github, id) : await treePaths(github, id, sha, warnings);
  return repositorySource(github, id, sha, paths, warnings);
}

/** A repository's files at a commit, or a branch, read from GitHub. */
export function repositorySource(github: Client, id: string, ref: string, paths: string[], warnings: string[]): Source {
  const [organization, repo] = id.split('/');
  return {
    repository: { id, organization, name: repo, url: `https://github.com/${id}`, commit: ref },
    paths,
    warnings,
    read: (path) => github.raw(`${RAW}/${id}/${encodePath(ref)}/${encodePath(path)}`),
  };
}

/** Code search looks at the whole default branch. */
async function searchPaths(github: Client, id: string): Promise<string[]> {
  const { items } = await searchCode(github, `repo:${id}`);
  return [...new Set(items.map((item) => item.path))]; // pages can repeat a result
}

export type SearchItem = { path: string; repository: { full_name: string } };

/**
 * Every SKILL.md code search finds for the qualifier, 100 a page, one page after the other: GitHub
 * answers concurrent code searches with 429. GitHub returns at most 1000 results, ten pages;
 * `complete` is false when it could not return them all: above the cap, or when the search timed
 * out. With `orNothing`, an incomplete search stops at once, after its first page.
 */
export async function searchCode(
  github: Client,
  qualifier: string,
  orNothing = false,
): Promise<{ items: SearchItem[]; complete: boolean }> {
  const items: SearchItem[] = [];
  let complete = true;
  for (let page = 1; page <= 10; page++) {
    const result = await github.json<{ total_count: number; incomplete_results?: boolean; items: SearchItem[] }>(
      `${API}/search/code?q=filename:SKILL.md+${qualifier}&per_page=100&page=${page}`,
    );
    if (result.total_count > 1000 || result.incomplete_results) complete = false;
    if (!complete && orNothing) return { items: [], complete };
    items.push(...result.items);
    if (result.items.length < 100 || page * 100 >= result.total_count) break;
  }
  return { items, complete };
}

type Tree = { truncated: boolean; tree: { path: string; mode: string; type: string; sha: string }[] };

/** The whole tree at once, or only the skill roots when it is too large for one answer. */
export async function treePaths(github: Client, id: string, ref: string, warnings: string[]): Promise<string[]> {
  const tree = await github.json<Tree>(`${API}/repos/${id}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  if (!tree.truncated) return files(tree);
  warnings.push(`the tree is too large to list at once; looked only in ${SKILL_ROOTS.join(', ')} (GITHUB_TOKEN searches everywhere)`);
  const paths: string[] = [];
  for (const root of SKILL_ROOTS) {
    const rootSha = await directory(github, id, ref, root);
    if (!rootSha) continue;
    const subtree = await github.json<Tree>(`${API}/repos/${id}/git/trees/${rootSha}?recursive=1`);
    paths.push(...files(subtree).map((path) => `${root}/${path}`));
  }
  return paths;
}

/** Walks down one level at a time; the directory's tree, or undefined if it does not exist. */
async function directory(github: Client, id: string, ref: string, path: string): Promise<string | undefined> {
  let current = encodeURIComponent(ref);
  for (const segment of path.split('/')) {
    const tree = await github.json<Tree>(`${API}/repos/${id}/git/trees/${current}`);
    const entry = tree.tree.find((item) => item.path === segment && item.type === 'tree');
    if (!entry) return undefined;
    current = entry.sha;
  }
  return current;
}

/** Regular files only: a symbolic link's content is its target, not a SKILL.md. */
function files(tree: Tree): string[] {
  return tree.tree.filter((item) => item.type === 'blob' && item.mode !== '120000').map((item) => item.path);
}

export type Client = ReturnType<typeof client>;

/** One client per repository: its answers are kept only while it is scanned. */
export function client({ fetch, token, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }: GitHubOptions) {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const answers = new Map<string, Promise<unknown>>(); // the root tree is asked for once per skill root

  /**
   * The answer, after one retry: a request that never got an answer is sent again a second later,
   * and one the rate limit stopped, once the limit resets, if that is within a minute.
   */
  async function send(url: string, init?: { headers: Record<string, string> }): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, init);
      } catch (error) {
        if (attempt === 0) {
          await wait(1000);
          continue;
        }
        // Not a blip: sent twice, so no other repository would get an answer either.
        throw new GitHubError(`Cannot reach GitHub: ${describe(error)}`);
      }
      if (!(await limited(response))) return response;
      const delay = retryDelay(response);
      if (attempt === 0 && delay !== undefined && delay <= LONGEST_WAIT) {
        await wait(delay);
        continue;
      }
      throw new GitHubError(`GitHub rate limit reached; ${token ? `try again ${resetTime(response)}` : 'set GITHUB_TOKEN'}`);
    }
  }

  async function request(url: string, notFound: string): Promise<unknown> {
    const response = await send(url, { headers });
    if (response.ok) return response.json();
    const text = await message(response);
    if (response.status === 404) throw new AtlasError(notFound);
    if (response.status === 409) throw new EmptyRepositoryError(text || `Repository is empty: ${url}`);
    if (response.status === 401) throw new GitHubError('GitHub rejected the token in GITHUB_TOKEN');
    throw new AtlasError(`GitHub answered ${response.status} for ${url}${text && `: ${text}`}`);
  }

  return {
    /** A GitHub API answer; `notFound` explains a 404. */
    json<T>(url: string, notFound = `Not found on GitHub: ${url}`): Promise<T> {
      if (!answers.has(url)) answers.set(url, request(url, notFound));
      return answers.get(url) as Promise<T>;
    },
    /** A file's bytes at the scanned commit, or undefined if it is not there; the token reads private repositories. */
    async raw(url: string): Promise<Uint8Array | undefined> {
      const response = await send(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      if (response.status === 404) return undefined;
      if (!response.ok) throw new AtlasError(`GitHub answered ${response.status} for ${url}`);
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

/** GitHub's message in an error answer, or nothing. */
async function message(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => undefined);
  const text = (body as { message?: unknown } | undefined)?.message;
  return typeof text === 'string' ? text : '';
}

/** Any 429; a 403 that says it is the rate limit, in its headers or in its message. */
async function limited(response: Response): Promise<boolean> {
  if (response.status === 429) return true;
  if (response.status !== 403) return false;
  if (response.headers.get('x-ratelimit-remaining') === '0' || response.headers.has('retry-after')) return true;
  return /rate limit/i.test(await message(response.clone()));
}

/** How long GitHub asks to wait, if it says. */
function retryDelay(response: Response): number | undefined {
  const after = response.headers.get('retry-after');
  if (after && /^\d+$/.test(after)) return Number(after) * 1000;
  const reset = response.headers.get('x-ratelimit-reset');
  if (response.headers.get('x-ratelimit-remaining') === '0' && reset && /^\d+$/.test(reset)) {
    return Math.max(0, Number(reset) * 1000 - Date.now()) + 1000;
  }
  return undefined;
}

/** `after 14:05 UTC`, when the limit resets, or `in a minute` if GitHub does not say. */
function resetTime(response: Response): string {
  const reset = response.headers.get('x-ratelimit-reset');
  return reset && /^\d+$/.test(reset) ? `after ${utcTime(Number(reset))}` : 'in a minute';
}

/** A Unix time as `14:05 UTC`. */
export function utcTime(seconds: number): string {
  return `${new Date(seconds * 1000).toISOString().slice(11, 16)} UTC`;
}

export function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message;
}
