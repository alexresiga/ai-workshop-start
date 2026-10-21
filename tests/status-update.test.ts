// spec/status-update.md: status.ts posts the PRs merged and the issues resolved since a date, against a fake GitHub and a fake Slack.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const STATUS = fileURLToPath(new URL('../.agents/skills/status-update/status.ts', import.meta.url));
const REPO = 'alexresiga/ai-workshop-start';
const URL_ = `https://github.com/${REPO}`;
const SINCE = '2026-10-21T09:00Z';

const pull = (number: number, title: string, merged_at: string | null, updated_at = merged_at ?? '2026-10-21T10:00:00Z', login = 'dev') => ({
  number, title, html_url: `${URL_}/pull/${number}`, user: { login }, merged_at, updated_at,
});
const issue = (number: number, title: string, closed_at: string, state_reason = 'completed', extra: object = {}) => ({
  number, title, html_url: `${URL_}/issues/${number}`, user: { login: 'alexresiga' }, closed_at, state_reason, ...extra,
});

type Pages = { pulls?: object[][]; issues?: object[][]; status?: number };

/** A fake GitHub: the pages of closed PRs and issues, newest updated first; it keeps the paths asked for. */
async function github(t: TestContext, pages: Pages) {
  const paths: string[] = [];
  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    paths.push(request.url!);
    const url = new URL(request.url!, 'http://x');
    const kind = url.pathname === `/repos/${REPO}/pulls` ? 'pulls' : url.pathname === `/repos/${REPO}/issues` ? 'issues' : undefined;
    if (pages.status || !kind) {
      response.writeHead(pages.status ?? 404, { 'content-type': 'application/json' }).end('{"message":"no"}');
      return;
    }
    const page = (pages[kind] ?? [])[Number(url.searchParams.get('page')) - 1] ?? [];
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(page));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return { api: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, paths };
}

type Call = { method: string; authorization?: string; body: Record<string, string> };

/** A fake Slack that answers chat.postMessage with `answer`, and keeps what it was sent. */
async function slack(t: TestContext, answer: object = { ok: true, ts: '1.2' }) {
  const calls: Call[] = [];
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const method = request.url!.slice(1);
    calls.push({ method, authorization: request.headers.authorization, body: Object.fromEntries(new URLSearchParams(raw)) });
    const body = method === 'chat.getPermalink' ? { ok: true, permalink: 'https://example.slack.com/archives/C1/p12' } : answer;
    response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(body));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return { api: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, calls };
}

function status(args: string[], env: Record<string, string | undefined>) {
  const child = spawn(process.execPath, [STATUS, ...args], {
    env: { PATH: process.env.PATH, SLACK_BOT_TOKEN: 'xoxb-test', SLACK_CHANNEL_ID: 'C1', SLACK_API: 'http://127.0.0.1:9', GITHUB_API: 'http://127.0.0.1:9', ...env },
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) => child.on('close', (code) => done({ code, stdout, stderr })));
}

const posts = (calls: Call[]) => calls.filter((c) => c.method === 'chat.postMessage');

test('posted: the merged PRs and the resolved issues, with emojis, in SLACK_CHANNEL_ID, with the token', async (t) => {
  const gh = await github(t, {
    pulls: [[pull(34, 'Hide warnings', '2026-10-21T11:07:00Z'), pull(32, 'Add a red agent', '2026-10-21T10:27:00Z', undefined, 'bot')]],
    issues: [[issue(33, 'Hide warnings by default', '2026-10-21T11:07:00Z')]],
  });
  const sl = await slack(t);
  const run = await status(['--since', SINCE], { GITHUB_API: gh.api, SLACK_API: sl.api });
  assert.equal(run.code, 0, run.stderr);
  assert.equal(run.stdout, 'posted in Slack: https://example.slack.com/archives/C1/p12\n');
  const [post] = posts(sl.calls);
  assert.equal(post.authorization, 'Bearer xoxb-test');
  assert.deepEqual(post.body, {
    channel: 'C1',
    unfurl_links: 'false',
    text: [
      `📣 *Status update for ${REPO}* since 2026-10-21 09:00 UTC`,
      '',
      '🚀 *Merged PRs (2)*',
      `• <${URL_}/pull/32|#32 Add a red agent> by @bot`,
      `• <${URL_}/pull/34|#34 Hide warnings> by @dev`,
      '',
      '✅ *Resolved issues (1)*',
      `• <${URL_}/issues/33|#33 Hide warnings by default> by @alexresiga`,
      '',
      '🎉 2 PRs merged, 1 issue resolved. Keep shipping! 🙌',
    ].join('\n'),
  });
  assert.deepEqual(sl.calls.find((c) => c.method === 'chat.getPermalink')!.body, { channel: 'C1', message_ts: '1.2' });
});

test('what goes in: not PRs closed unmerged or merged before; not issues not planned, duplicates, closed before, or PRs', async (t) => {
  const gh = await github(t, {
    pulls: [[
      pull(40, 'Merged', '2026-10-21T09:00:00Z'),
      pull(41, 'Closed unmerged', null),
      pull(42, 'Merged before, updated after', '2026-10-21T08:59:00Z', '2026-10-21T12:00:00Z'),
    ]],
    issues: [[
      issue(50, 'Fixed', '2026-10-21T10:00:00Z'),
      issue(51, 'Not planned', '2026-10-21T10:00:00Z', 'not_planned'),
      issue(52, 'Duplicate', '2026-10-21T10:00:00Z', 'duplicate'),
      issue(53, 'Closed before, updated after', '2026-10-20T10:00:00Z'),
      issue(40, 'Merged', '2026-10-21T09:00:00Z', 'completed', { pull_request: { url: 'x' } }),
    ]],
  });
  const run = await status(['--since', SINCE, '--dry-run'], { GITHUB_API: gh.api });
  assert.equal(run.code, 0, run.stderr);
  assert.match(run.stdout, /🚀 \*Merged PRs \(1\)\*\n• <[^|]+\|#40 Merged> by @dev\n\n✅ \*Resolved issues \(1\)\*\n• <[^|]+\|#50 Fixed> by @alexresiga\n/);
  assert.match(gh.paths.find((p) => p.includes('/issues'))!, /state=closed&since=2026-10-21T09:00:00.000Z/);
  assert.match(gh.paths.find((p) => p.includes('/pulls'))!, /state=closed&sort=updated&direction=desc/);
});

test('every page GitHub has, 100 at a time; the PRs stop at a page that goes back past --since', async (t) => {
  const many = (from: number, at: string) => Array.from({ length: 100 }, (_, i) => pull(from + i, `PR ${from + i}`, at));
  const gh = await github(t, {
    pulls: [many(100, '2026-10-21T12:00:00Z'), [...many(200, '2026-10-21T11:00:00Z').slice(0, 99), pull(299, 'Old', '2026-10-20T00:00:00Z')], many(300, '2026-10-21T10:00:00Z')],
    issues: [Array.from({ length: 100 }, (_, i) => issue(1000 + i, `Issue ${i}`, '2026-10-21T10:00:00Z')), [issue(2000, 'Last', '2026-10-21T10:00:00Z')]],
  });
  const run = await status(['--since', SINCE, '--dry-run'], { GITHUB_API: gh.api });
  assert.equal(run.code, 0, run.stderr);
  assert.match(run.stdout, /🚀 \*Merged PRs \(199\)\*/);
  assert.match(run.stdout, /✅ \*Resolved issues \(101\)\*/);
  assert.deepEqual(gh.paths.filter((p) => p.includes('/pulls')).map((p) => new URL(p, 'http://x').searchParams.get('page')), ['1', '2']);
  assert.ok(gh.paths.every((p) => p.includes('per_page=100')));
});

test('each line: the title escaped; a section with none → • _none_', async (t) => {
  const gh = await github(t, { pulls: [[pull(7, 'Fix <b> & "a" > b', '2026-10-21T10:00:00Z')]] });
  const run = await status(['--since', SINCE, '--dry-run'], { GITHUB_API: gh.api });
  assert.equal(run.code, 0, run.stderr);
  assert.match(run.stdout, /#7 Fix &lt;b&gt; &amp; "a" &gt; b> by @dev\n/);
  assert.match(run.stdout, /✅ \*Resolved issues \(0\)\*\n• _none_\n/);
  assert.match(run.stdout, /🎉 1 PR merged, 0 issues resolved\. Keep shipping! 🙌\n$/);
});

test('nothing merged or resolved → a quiet message, still posted', async (t) => {
  const gh = await github(t, {});
  const sl = await slack(t);
  const run = await status(['--since', '2026-10-21'], { GITHUB_API: gh.api, SLACK_API: sl.api });
  assert.equal(run.code, 0, run.stderr);
  assert.equal(posts(sl.calls)[0].body.text, `🦗 Nothing merged or resolved in *${REPO}* since 2026-10-21 00:00 UTC. Quiet times! 😴`);
});

test('--since: a date is midnight UTC; a zone is taken into account; no zone is UTC', async (t) => {
  const gh = await github(t, {});
  for (const [since, shown] of [['2026-10-21', '2026-10-21 00:00'], ['2026-10-21T11:30+02:00', '2026-10-21 09:30'], ['2026-10-21T09:15', '2026-10-21 09:15']]) {
    const run = await status(['--since', since, '--dry-run'], { GITHUB_API: gh.api });
    assert.equal(run.code, 0, run.stderr);
    assert.match(run.stdout, new RegExp(`since ${shown} UTC`), since);
  }
});

test('--repo: another repository', async (t) => {
  const gh = await github(t, {});
  const run = await status(['--since', SINCE, '--repo', 'JetBrains/kotlin', '--dry-run'], { GITHUB_API: gh.api });
  assert.equal(run.code, 1);
  assert.equal(run.stderr, 'GitHub answered 404 for /repos/JetBrains/kotlin/pulls?state=closed&sort=updated&direction=desc&per_page=100&page=1\n');
});

test('a bad command line → a clear message and the usage, exit 2, nothing posted', async (t) => {
  const sl = await slack(t);
  for (const [args, reason] of [
    [[], 'no --since'],
    [['--since', '2026-02-30'], '--since needs a date, 2026-10-21, or a date and time, 2026-10-21T09:00Z: not "2026-02-30"'],
    [['--since', 'yesterday'], '--since needs a date, 2026-10-21, or a date and time, 2026-10-21T09:00Z: not "yesterday"'],
    [['--since', SINCE, '--repo', 'kotlin'], '--repo needs owner/name: not "kotlin"'],
    [['--since', SINCE, '--channel', 'C2'], 'unknown argument: --channel'],
  ] as [string[], string][]) {
    const run = await status(args, { SLACK_API: sl.api });
    assert.equal(run.code, 2, args.join(' '));
    assert.equal(run.stderr.split('\n')[0], reason);
    assert.match(run.stderr, /^usage: node \.agents\/skills\/status-update\/status\.ts --since/m);
  }
  assert.deepEqual(sl.calls, []);
});

test('no SLACK_BOT_TOKEN or SLACK_CHANNEL_ID → a clear message, exit 2; --dry-run does not need them', async (t) => {
  const gh = await github(t, {});
  const noToken = await status(['--since', SINCE], { GITHUB_API: gh.api, SLACK_BOT_TOKEN: undefined });
  assert.equal(noToken.code, 2);
  assert.equal(noToken.stderr, 'SLACK_BOT_TOKEN is not set: it is needed to post in Slack\n');
  const noChannel = await status(['--since', SINCE], { GITHUB_API: gh.api, SLACK_CHANNEL_ID: '' });
  assert.equal(noChannel.code, 2);
  assert.equal(noChannel.stderr, 'SLACK_CHANNEL_ID is not set: it is needed to post in Slack\n');
  assert.deepEqual(gh.paths, []);
  const dry = await status(['--since', SINCE, '--dry-run'], { GITHUB_API: gh.api, SLACK_BOT_TOKEN: undefined, SLACK_CHANNEL_ID: undefined });
  assert.equal(dry.code, 0, dry.stderr);
  assert.match(dry.stdout, /^🦗 Nothing merged/);
});

test('GitHub refuses → GitHub answered <status> for <path>, exit 1, nothing posted', async (t) => {
  const gh = await github(t, { status: 403 });
  const sl = await slack(t);
  const run = await status(['--since', SINCE], { GITHUB_API: gh.api, SLACK_API: sl.api });
  assert.equal(run.code, 1);
  assert.match(run.stderr, /^GitHub answered 403 for \/repos\/alexresiga\/ai-workshop-start\/(pulls|issues)\?/);
  assert.deepEqual(sl.calls, []);
});

test('Slack refuses or is out of reach → its error, exit 1', async (t) => {
  const gh = await github(t, {});
  const sl = await slack(t, { ok: false, error: 'not_in_channel' });
  const refused = await status(['--since', SINCE], { GITHUB_API: gh.api, SLACK_API: sl.api });
  assert.equal(refused.code, 1);
  assert.equal(refused.stderr, 'Slack refused the status update: not_in_channel\n');
  const away = await status(['--since', SINCE], { GITHUB_API: gh.api, SLACK_API: 'http://127.0.0.1:9' });
  assert.equal(away.code, 1);
  assert.match(away.stderr, /^Slack is out of reach: /);
});

test('the GitHub token, when set, goes with each request', async (t) => {
  const seen: (string | undefined)[] = [];
  const server = createServer((request, response) => {
    seen.push(request.headers.authorization);
    response.writeHead(200, { 'content-type': 'application/json' }).end('[]');
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  const api = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const run = await status(['--since', SINCE, '--dry-run'], { GITHUB_API: api, GITHUB_TOKEN: 'ghp-test' });
  assert.equal(run.code, 0, run.stderr);
  assert.deepEqual(seen, ['Bearer ghp-test', 'Bearer ghp-test']);
});
