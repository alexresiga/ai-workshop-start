// spec/status-update.md: the PRs merged and the issues resolved since a date and time, posted in the Slack channel.

type Options = { since: Date; repo: string; dryRun: boolean };
type User = { login: string };
type Pull = { number: number; title: string; html_url: string; user: User | null; merged_at: string | null; updated_at: string };
type Issue = { number: number; title: string; html_url: string; user: User | null; closed_at: string | null; state_reason?: string | null; pull_request?: unknown };
/** One line of the message: a merged PR or a resolved issue. */
export type Item = { number: number; title: string; url: string; author: string; at: string };
type Answer = { ok: boolean; error?: string; [key: string]: unknown };

const USAGE = 'usage: node .agents/skills/status-update/status.ts --since <date or date and time> [--repo <owner/name>] [--dry-run]';
const REPO = 'alexresiga/ai-workshop-start';
const PAGE = 100;

/** `2026-10-21` is midnight UTC; a date and time with no zone is UTC too. */
export function parseSince(value: string): Date | undefined {
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}(?::\d{2})?)(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!match) return undefined;
  const [, day, time = '00:00', zone = 'Z'] = match;
  const date = new Date(`${day}T${time}${zone}`);
  if (Number.isNaN(date.getTime())) return undefined;
  // new Date rolls 2026-02-30 over to March 2: the day must be the one given.
  return new Date(`${day}T00:00Z`).toISOString().slice(0, 10) === day ? date : undefined;
}

/** The command line, or the reason it is wrong. */
export function parse(args: string[]): Options | string {
  let since: Date | undefined;
  let repo = REPO;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--since') {
      const value = args[++i] ?? '';
      since = parseSince(value);
      if (!since) return `--since needs a date, 2026-10-21, or a date and time, 2026-10-21T09:00Z: not "${value}"`;
    } else if (arg === '--repo') {
      repo = args[++i] ?? '';
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return `--repo needs owner/name: not "${repo}"`;
    } else return `unknown argument: ${arg}`;
  }
  return since ? { since, repo, dryRun } : 'no --since';
}

/** `2026-10-21 09:00 UTC`. */
const when = (date: Date) => date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

/** Slack's mrkdwn takes &, < and > as markup. */
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** The Slack message, with its emojis. */
export function message(repo: string, since: Date, pulls: Item[], issues: Item[]): string {
  if (!pulls.length && !issues.length) return `🦗 Nothing merged or resolved in *${escape(repo)}* since ${when(since)}. Quiet times! 😴`;
  const line = (item: Item) => `• <${item.url}|#${item.number} ${escape(item.title)}> by @${escape(item.author)}`;
  const section = (title: string, items: Item[]) => [`${title} (${items.length})*`, ...(items.length ? items.map(line) : ['• _none_'])];
  return [
    `📣 *Status update for ${escape(repo)}* since ${when(since)}`,
    '',
    ...section('🚀 *Merged PRs', pulls),
    '',
    ...section('✅ *Resolved issues', issues),
    '',
    `🎉 ${plural(pulls.length, 'PR')} merged, ${plural(issues.length, 'issue')} resolved. Keep shipping! 🙌`,
  ].join('\n');
}

/** Slack truncates a message over 40,000 characters, and says nothing; it advises 4,000 at most. */
export const LIMIT = 4000;

/** The message in parts of at most `limit` characters, cut between lines, so none is truncated. */
export function split(text: string, limit = LIMIT): string[] {
  const parts: string[] = [];
  let part = '';
  for (const line of text.split('\n')) {
    if (part && part.length + 1 + line.length > limit) {
      parts.push(part.replace(/\n+$/, ''));
      part = line;
    } else part = part ? `${part}\n${line}` : line;
  }
  return [...parts, part];
}

class Refused extends Error {}

async function github<T>(api: string, token: string | undefined, path: string): Promise<T[]> {
  const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': 'skill-atlas-status-update' };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(`${api}${path}`, { headers });
  if (!response.ok) throw new Refused(`GitHub answered ${response.status} for ${path}`);
  return (await response.json()) as T[];
}

const item = (from: { number: number; title: string; html_url: string; user: User | null }, at: string): Item => ({
  number: from.number,
  title: from.title,
  url: from.html_url,
  author: from.user?.login ?? 'ghost',
  at,
});

const oldestFirst = (a: Item, b: Item) => a.at.localeCompare(b.at) || a.number - b.number;

/** The PRs merged since then, oldest first: newest updated first, until a page goes back past `since`. */
export async function mergedPulls(api: string, token: string | undefined, repo: string, since: Date): Promise<Item[]> {
  const found: Item[] = [];
  for (let page = 1; ; page++) {
    const pulls = await github<Pull>(api, token, `/repos/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=${PAGE}&page=${page}`);
    for (const pull of pulls) if (pull.merged_at && new Date(pull.merged_at) >= since) found.push(item(pull, pull.merged_at));
    if (pulls.length < PAGE || new Date(pulls[pulls.length - 1].updated_at) < since) break;
  }
  return found.sort(oldestFirst);
}

/** The issues closed as completed since then, oldest first; PRs, "not planned" and duplicates are not. */
export async function resolvedIssues(api: string, token: string | undefined, repo: string, since: Date): Promise<Item[]> {
  const found: Item[] = [];
  for (let page = 1; ; page++) {
    const issues = await github<Issue>(api, token, `/repos/${repo}/issues?state=closed&since=${since.toISOString()}&per_page=${PAGE}&page=${page}`);
    for (const issue of issues) {
      if (issue.pull_request || issue.state_reason !== 'completed' || !issue.closed_at || new Date(issue.closed_at) < since) continue;
      found.push(item(issue, issue.closed_at));
    }
    if (issues.length < PAGE) break;
  }
  return found.sort(oldestFirst);
}

async function slack(api: string, token: string, method: string, body: Record<string, string>): Promise<Answer> {
  const response = await fetch(`${api}/${method}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: new URLSearchParams(body),
  });
  if (response.status === 429) return { ok: false, error: `rate limited, retry after ${response.headers.get('retry-after') ?? '?'} s` };
  if (!response.ok) return { ok: false, error: `Slack answered ${response.status}` };
  return (await response.json()) as Answer;
}

export async function main(args: string[], env = process.env): Promise<number> {
  const options = parse(args);
  if (typeof options === 'string') {
    console.error(`${options}\n${USAGE}`);
    return 2;
  }
  const token = env.SLACK_BOT_TOKEN;
  const channel = env.SLACK_CHANNEL_ID;
  if (!options.dryRun && (!token || !channel)) {
    console.error(`${!token ? 'SLACK_BOT_TOKEN' : 'SLACK_CHANNEL_ID'} is not set: it is needed to post in Slack`);
    return 2;
  }
  const githubApi = (env.GITHUB_API || 'https://api.github.com').replace(/\/$/, '');
  const githubToken = env.GITHUB_TOKEN || env.GH_TOKEN || undefined;

  let text: string;
  try {
    const [pulls, issues] = await Promise.all([
      mergedPulls(githubApi, githubToken, options.repo, options.since),
      resolvedIssues(githubApi, githubToken, options.repo, options.since),
    ]);
    text = message(options.repo, options.since, pulls, issues);
  } catch (error) {
    console.error(error instanceof Refused ? error.message : `GitHub is out of reach: ${(error as Error).message}`);
    return 1;
  }
  if (options.dryRun) {
    console.log(text);
    return 0;
  }

  const api = (env.SLACK_API || 'https://slack.com/api').replace(/\/$/, '');
  const parts = split(text);
  for (const [i, part] of parts.entries()) {
    const which = parts.length > 1 ? `, message ${i + 1} of ${parts.length}` : '';
    let posted: Answer;
    try {
      posted = await slack(api, token!, 'chat.postMessage', { channel: channel!, text: part, unfurl_links: 'false' });
    } catch (error) {
      console.error(`Slack is out of reach${which}: ${(error as Error).message}`);
      return 1;
    }
    if (!posted.ok) {
      console.error(`Slack refused the status update${which}: ${posted.error}`);
      return 1;
    }
    const link = await slack(api, token!, 'chat.getPermalink', { channel: channel!, message_ts: posted.ts as string }).catch(() => undefined);
    console.log(`posted in Slack: ${link?.ok ? link.permalink : `${channel} at ${posted.ts}`}`);
  }
  return 0;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
