// An organization's skills, counted by repository. Each repository goes through the same scan as
// on its own; what is organization-wide is spending GitHub's rate limit carefully: one code search
// for the whole account, the listing's own answers instead of a request per repository, and a check
// of what is left of the limit before asking for each repository's tree.
import { AtlasError, EmptyRepositoryError, GitHubError } from './errors.ts';
import {
  API,
  client,
  repositorySource,
  searchCode,
  treePaths,
  TRUNCATED_COST,
  utcTime,
  type Client,
  type Fetch,
  type GitHubOptions,
} from './github.ts';
import { sortSkills, type Skill } from './model.ts';
import { scan } from './scan.ts';

/** At most this many requests to GitHub at a time. */
export const AT_ONCE = 16;

/** `https://github.com/<organization or user>`, with or without the scheme or a trailing slash. */
export function parseOrganizationUrl(input: string): string | undefined {
  return /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-z\d][a-z\d-]*)\/?$/i.exec(input.trim())?.[1];
}

export type OrganizationResult = {
  /** The account, an organization or a user: its login and its GitHub page. */
  organization: { id: string; url: string };
  /** The repositories with skills: most skills first, then by name. */
  repositories: { id: string; url: string; skills: number }[];
  /** How many repositories were scanned: the account's own, forks left out. */
  scanned: number;
  /** Every skill of those repositories, sorted by name. */
  skills: Skill[];
  warnings: string[];
};

/** How far the scan is: the repositories done, of how many; called with 0 once they are listed. */
export type Progress = (scanned: number, of: number) => void;

type Account = { login: string; type: string; public_repos: number };
type Listed = { full_name: string; default_branch: string; fork: boolean; private: boolean };

/** Every repository of the account scanned, the skills counted; a problem in one is a warning. */
export async function scanOrganization(input: string, options: GitHubOptions, progress: Progress = () => {}): Promise<OrganizationResult> {
  const name = parseOrganizationUrl(input);
  if (!name) throw new AtlasError(`Not a GitHub organization URL: ${input}`);
  const limited = { ...options, fetch: atMost(AT_ONCE, options.fetch) };
  const github = client(limited);
  const account = await github.json<Account>(`${API}/users/${name}`, `Organization not found: https://github.com/${name}`);
  const organization = account.type === 'Organization';
  // The listing and the search at the same time: neither needs the other.
  const [listed, found] = await Promise.all([
    listRepositories(github, account, organization),
    options.token ? searchAccount(github, `${organization ? 'org' : 'user'}:${account.login}`) : undefined,
  ]);
  const repositories = listed.filter((repository) => !repository.fork);
  // Without a complete search, each repository's tree; with one, only the repositories it found are read.
  let trees = found ? 0 : repositories.length;
  // A client of its own each time: the limit left changes as the scan goes.
  const budget = (needed: number) => checkBudget(client(limited), needed, account.login, Boolean(options.token));
  if (trees > 0) await budget(trees);

  const counts = new Map<string, number>();
  const skills: Skill[] = [];
  const warnings: string[] = [];
  let scanned = 0;
  progress(scanned, repositories.length);
  await forEach(repositories, async (repository) => {
    await scanOne(repository);
    progress(++scanned, repositories.length);
  });
  /** One repository: its skills counted, or a warning. */
  async function scanOne(repository: Listed) {
    const id = repository.full_name;
    const paths = found?.get(id);
    if (found && !paths) return; // no SKILL.md in it
    try {
      // A client of its own: its answers are released once it is scanned.
      const github = client(limited);
      const listing: string[] = [];
      let files = paths;
      if (!files) {
        trees--;
        // A tree too large for one answer costs more than the one request counted: checked again, then.
        files = await treePaths(github, id, repository.default_branch, listing, () => budget(TRUNCATED_COST + trees));
      }
      const result = await scan(repositorySource(github, id, repository.default_branch, files, listing));
      if (result.skills.length) counts.set(id, result.skills.length);
      skills.push(...result.skills);
      warnings.push(...result.warnings.map((warning) => `${id}: ${warning}`));
    } catch (error) {
      if (error instanceof EmptyRepositoryError) return; // nothing to scan, nothing to say
      if (error instanceof GitHubError || !(error instanceof AtlasError)) throw error;
      warnings.push(`${id}: ${error.message}; skipped`);
    }
  }

  const sorted = [...counts].sort(([a, m], [b, n]) => n - m || (a < b ? -1 : a > b ? 1 : 0));
  return {
    organization: { id: account.login, url: `https://github.com/${account.login}` },
    repositories: sorted.map(([id, skills]) => ({ id, url: `https://github.com/${id}`, skills })),
    scanned: repositories.length,
    skills: sortSkills(skills),
    warnings: warnings.sort(),
  };
}

/**
 * Every repository, 100 a page. The pages the public count implies are asked for at once; then,
 * while the last page is full, the next: with a token, an organization also lists private ones.
 */
async function listRepositories(github: Client, account: Account, organization: boolean): Promise<Listed[]> {
  const url = (page: number) =>
    organization
      ? `${API}/orgs/${account.login}/repos?type=all&per_page=100&page=${page}`
      : `${API}/users/${account.login}/repos?type=owner&per_page=100&page=${page}`;
  const known = Math.max(1, Math.ceil(account.public_repos / 100));
  const pages = await Promise.all(Array.from({ length: known }, (_, index) => github.json<Listed[]>(url(index + 1))));
  for (let page = known + 1; pages.at(-1)!.length === 100; page++) pages.push(await github.json<Listed[]>(url(page)));
  const byName = new Map<string, Listed>(); // a repository created while listing shifts the pages
  for (const repository of pages.flat()) byName.set(repository.full_name, repository);
  return [...byName.values()];
}

/** The SKILL.md paths of the whole account by repository, from one search; undefined if it cannot find them all. */
async function searchAccount(github: Client, qualifier: string): Promise<Map<string, string[]> | undefined> {
  const { items, complete } = await searchCode(github, qualifier, true);
  if (!complete) return undefined;
  const found = new Map<string, Set<string>>(); // pages can repeat a result
  for (const { path, repository } of items) {
    found.set(repository.full_name, (found.get(repository.full_name) ?? new Set()).add(path));
  }
  return new Map([...found].map(([id, paths]) => [id, [...paths]]));
}

/**
 * Stops before the scan when what is left of the rate limit cannot pay for a tree per repository:
 * the message says how many, rather than an answer cut off halfway. `/rate_limit` itself is free.
 */
async function checkBudget(github: Client, needed: number, login: string, token: boolean) {
  let core: { remaining: number; reset: number };
  try {
    ({ core } = (await github.json<{ resources: { core: { remaining: number; reset: number } } }>(`${API}/rate_limit`)).resources);
  } catch (error) {
    if (error instanceof GitHubError) throw error;
    return; // not known: the scan finds out as it goes
  }
  if (core.remaining >= needed) return;
  throw new GitHubError(
    `Scanning ${login} needs ${needed} GitHub requests, and ${core.remaining} are left until ${utcTime(core.reset)}; ` +
      (token ? 'try again then' : 'set GITHUB_TOKEN'),
  );
}

/** Calls `each` for every item, at most AT_ONCE at a time; the first unexpected failure stops the rest. */
async function forEach<T>(items: T[], each: (item: T) => Promise<void>) {
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < items.length) {
      try {
        await each(items[next++]);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, items.length) }, worker));
}

/** The fetch, with at most `limit` requests in flight. */
export function atMost(limit: number, fetch: Fetch): Fetch {
  let running = 0;
  const waiting: (() => void)[] = [];
  return async (url, init) => {
    if (running < limit) running++;
    else await new Promise<void>((resolve) => waiting.push(resolve)); // a finished request hands over its place
    try {
      return await fetch(url, init);
    } finally {
      const next = waiting.shift();
      if (next) next();
      else running--;
    }
  };
}
