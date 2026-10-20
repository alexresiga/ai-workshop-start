import { AtlasError, GitHubError } from './errors.ts';
import { SKILL_ROOTS } from './find.ts';
import type { OrganizationSource } from './organization.ts';
import type { Source } from './scan.ts';

/** The part of `fetch` the core uses, so tests and the browser can pass their own. */
export type Fetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<Response>;

export type GitHubOptions = {
  fetch: Fetch;
  /** With a token, skills are found through code search, a fork's through its tree; without a token, through the tree. */
  token?: string;
};

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';

/** `https://github.com/owner/repo`, with or without the scheme, a trailing slash or `.git`. */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | undefined {
  const match = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i.exec(input.trim());
  return match ? { owner: match[1], repo: match[2] } : undefined;
}

/** `https://github.com/owner`, with or without the scheme or a trailing slash: an organization's or a user's account. */
export function parseGitHubOrganization(input: string): string | undefined {
  return /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-z\d][a-z\d-]*)\/?$/i.exec(input.trim())?.[1];
}

type RepositoryInfo = { full_name: string; default_branch: string; fork?: boolean };

/** Resolves the default branch to a commit and lists the files that may be skills. */
export async function openGitHub(input: string, options: GitHubOptions): Promise<Source> {
  const name = parseGitHubUrl(input);
  if (!name) throw new AtlasError(`Not a GitHub repository URL: ${input}`);
  const github = client(options);
  const info = await github.json<RepositoryInfo>(
    `${API}/repos/${name.owner}/${name.repo}`,
    `Repository not found: https://github.com/${name.owner}/${name.repo}`,
  );
  return openRepository(github, info, options);
}

/** The repository at its default branch's commit; `found`, the SKILL.md paths a search has already found in it. */
async function openRepository(github: Client, info: RepositoryInfo, options: GitHubOptions, found?: string[]): Promise<Source> {
  const id = info.full_name;
  const { sha } = await github.json<{ sha: string }>(`${API}/repos/${id}/commits/${encodePath(info.default_branch)}`);
  const warnings: string[] = [];
  // Code search leaves forks out: a fork's skills are in its tree.
  const searched = options.token && !info.fork;
  const paths = found ?? (searched ? await searchPaths(github, id) : await treePaths(github, id, sha, warnings, options.token));
  const [organization, repo] = id.split('/');
  return {
    repository: { id, organization, name: repo, url: `https://github.com/${id}`, commit: sha },
    paths,
    warnings,
    read: (path) => github.raw(`${RAW}/${id}/${sha}/${encodePath(path)}`),
  };
}

/**
 * An organization's, or a user's, repositories. With a token, one code search over the whole
 * account finds the ones with a SKILL.md, and only those, and the forks it leaves out, are opened;
 * past the 1000 results GitHub returns, each repository is searched on its own. Without a token,
 * each repository's tree.
 */
export async function openOrganization(input: string, options: GitHubOptions): Promise<OrganizationSource> {
  const name = parseGitHubOrganization(input);
  if (!name) throw new AtlasError(`Not a GitHub organization URL: ${input}`);
  const github = client(options);
  const account = await github.json<{ login: string; type: string; public_repos?: number }>(
    `${API}/users/${name}`,
    `Organization not found: https://github.com/${name}`,
  );
  const organization = account.type === 'Organization';
  const [listed, found] = await Promise.all([
    listRepositories(github, `${API}/${organization ? 'orgs' : 'users'}/${account.login}/repos`, account.public_repos ?? 0),
    options.token ? searchAccount(github, `${organization ? 'org' : 'user'}:${account.login}`) : undefined,
  ]);
  return {
    organization: { id: account.login, url: `https://github.com/${account.login}` },
    repositories: listed.map((info) => {
      const paths = found?.get(info.full_name.toLowerCase());
      return {
        id: info.full_name,
        // A client of its own: its answers, the tree above all, go when the repository is scanned.
        open: async () => (found && !paths && !info.fork ? undefined : openRepository(client(options), info, options, paths)),
      };
    }),
  };
}

/**
 * Every page, 100 repositories a page: the pages the public count tells of, at once; then, while a
 * page is full, the next one: with a token, the private repositories are listed, too.
 */
async function listRepositories(github: Client, url: string, known: number): Promise<RepositoryInfo[]> {
  const page = (number: number) => github.json<RepositoryInfo[]>(`${url}?per_page=100&page=${number}`);
  const first = Math.max(1, Math.ceil(known / 100));
  const listed = (await Promise.all(Array.from({ length: first }, (_, index) => page(index + 1)))).flat();
  for (let number = first + 1; listed.length === (number - 1) * 100; number++) listed.push(...(await page(number)));
  return listed;
}

type SearchResult = { total_count: number; items: { path: string; repository?: { full_name: string } }[] };

/**
 * Code search, 100 results a page; GitHub returns at most 1000 results: ten pages. Above `wanted`
 * results, the first page is all: the rest would be thrown away, and searches are few a minute.
 * One page after another: GitHub answers 429 to code searches asked at the same time.
 */
async function search(github: Client, qualifier: string, wanted = Infinity): Promise<SearchResult> {
  const items: SearchResult['items'] = [];
  let total = 0;
  for (let page = 1; page <= 10; page++) {
    const result = await github.json<SearchResult>(`${API}/search/code?q=filename:SKILL.md+${qualifier}&per_page=100&page=${page}`);
    items.push(...result.items);
    total = result.total_count;
    if (result.items.length < 100 || page * 100 >= result.total_count || total > wanted) break;
  }
  return { total_count: total, items };
}

/** Code search looks at the whole default branch. */
async function searchPaths(github: Client, id: string): Promise<string[]> {
  const { items } = await search(github, `repo:${id}`);
  return [...new Set(items.map((item) => item.path))]; // pages can repeat a result
}

/** The SKILL.md paths by repository, lower case `owner/name`; undefined when there are more than the search returns. */
async function searchAccount(github: Client, qualifier: string): Promise<Map<string, string[]> | undefined> {
  const { total_count, items } = await search(github, qualifier, 1000);
  if (total_count > 1000) return undefined;
  const paths = new Map<string, Set<string>>();
  for (const item of items) {
    const id = item.repository?.full_name.toLowerCase();
    if (id) paths.set(id, (paths.get(id) ?? new Set()).add(item.path));
  }
  return new Map([...paths].map(([id, found]) => [id, [...found]]));
}

type Tree = { truncated: boolean; tree: { path: string; mode: string; type: string; sha: string }[] };

/** The whole tree at once, or only the skill roots when it is too large for one answer. */
async function treePaths(github: Client, id: string, sha: string, warnings: string[], token?: string): Promise<string[]> {
  const tree = await github.json<Tree>(`${API}/repos/${id}/git/trees/${sha}?recursive=1`);
  if (!tree.truncated) return files(tree);
  const why = token ? 'code search leaves forks out' : 'GITHUB_TOKEN searches everywhere';
  warnings.push(`the tree is too large to list at once; looked only in ${SKILL_ROOTS.join(', ')} (${why})`);
  const paths: string[] = [];
  for (const root of SKILL_ROOTS) {
    const rootSha = await directory(github, id, sha, root);
    if (!rootSha) continue;
    const subtree = await github.json<Tree>(`${API}/repos/${id}/git/trees/${rootSha}?recursive=1`);
    paths.push(...files(subtree).map((path) => `${root}/${path}`));
  }
  return paths;
}

/** Walks down one level at a time; the directory's tree, or undefined if it does not exist. */
async function directory(github: Client, id: string, sha: string, path: string): Promise<string | undefined> {
  let current = sha;
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

type Client = ReturnType<typeof client>;

function client({ fetch, token }: GitHubOptions) {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const answers = new Map<string, Promise<unknown>>(); // the root tree is asked for once per skill root

  async function get(url: string, init?: { headers: Record<string, string> }): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error) {
      throw new GitHubError(`Cannot reach GitHub: ${describe(error)}`);
    }
  }

  async function request(url: string, notFound: string): Promise<unknown> {
    const response = await get(url, { headers });
    if (response.ok) return response.json();
    const body: unknown = await response.json().catch(() => undefined);
    const message = (body as { message?: unknown } | undefined)?.message;
    const text = typeof message === 'string' ? message : '';
    if (response.status === 404) throw new AtlasError(notFound);
    if (response.status === 429 || (response.status === 403 && /rate limit/i.test(text))) {
      throw new GitHubError(`GitHub rate limit reached; ${token ? 'try again in a minute' : 'set GITHUB_TOKEN'}`);
    }
    if (response.status === 409 && /empty/i.test(text)) throw new AtlasError('the repository is empty');
    if (response.status === 401) throw new GitHubError('GitHub rejected the token in GITHUB_TOKEN');
    throw new AtlasError(`GitHub answered ${response.status} for ${url}${text && `: ${text}`}`);
  }

  return {
    /** A GitHub API answer; `notFound` explains a 404. */
    json<T>(url: string, notFound = `Not found on GitHub: ${url}`): Promise<T> {
      if (!answers.has(url)) answers.set(url, request(url, notFound));
      return answers.get(url) as Promise<T>;
    },
    /** A file's bytes at the scanned commit, or undefined if it is not there. */
    async raw(url: string): Promise<Uint8Array | undefined> {
      const response = await get(url);
      if (response.status === 404) return undefined;
      if (!response.ok) throw new AtlasError(`GitHub answered ${response.status} for ${url}`);
      return new Uint8Array(await response.arrayBuffer());
    },
  };
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function describe(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return error.cause instanceof Error ? `${error.message} (${error.cause.message})` : error.message;
}
