// spec/ask.md: ask.ts posts the question, waits for a reply in its thread, and prints the answer, against a fake Slack.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { REACTIONS } from '../.agents/skills/issue-to-pr/ask.ts';

const ASK = fileURLToPath(new URL('../.agents/skills/issue-to-pr/ask.ts', import.meta.url));
const QUESTION = 'Which repository does the dice use?';
const TS = '1700000000.000100';
const BOT = { bot_id: 'B1', user: 'U0BOT' };

type Call = { method: string; authorization?: string; body: Record<string, string> };
/** What the fake Slack answers to a method, given how many times it was called. */
type Handler = (body: Record<string, string>, nth: number) => { status?: number; body?: unknown };

const posted: Handler = () => ({ body: { ok: true, channel: 'C1', ts: TS, message: { ts: TS, text: QUESTION, ...BOT } } });
const permalink: Handler = () => ({ body: { ok: true, permalink: 'https://example.slack.com/archives/C1/p1700000000000100' } });
const thread = (...replies: object[]): Handler => () => ({ body: { ok: true, messages: [{ ts: TS, text: QUESTION, ...BOT }, ...replies] } });
/** No reply for the first `n` checks, then these. */
const after = (n: number, ...replies: object[]): Handler => (body, nth) => (nth < n ? thread() : thread(...replies))(body, nth);

async function slack(t: TestContext, handlers: Record<string, Handler>) {
  const calls: Call[] = [];
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    const method = request.url!.slice(1);
    const body = Object.fromEntries(new URLSearchParams(raw));
    const nth = calls.filter((c) => c.method === method).length;
    calls.push({ method, authorization: request.headers.authorization, body });
    const answer = handlers[method]?.(body, nth) ?? { body: { ok: false, error: 'unknown_method' } };
    response.writeHead(answer.status ?? 200, { 'content-type': 'application/json' }).end(JSON.stringify(answer.body ?? {}));
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  return { api: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, calls };
}

function ask(args: string[], env: Record<string, string | undefined>) {
  const child = spawn(process.execPath, [ASK, ...args], {
    env: { PATH: process.env.PATH, SLACK_BOT_TOKEN: 'xoxb-test', CHANNEL_ID: 'C1', ...env },
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (d) => (stdout += d));
  child.stderr.on('data', (d) => (stderr += d));
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((done) =>
    child.on('close', (code) => done({ code, stdout, stderr })),
  );
}

const FAST = ['--wait', '0.02', '--poll', '0.05'];

test('the question is posted to the channel, as it is, with the token; its link goes to stderr', async (t) => {
  const { api, calls } = await slack(t, {
    'chat.postMessage': posted,
    'chat.getPermalink': permalink,
    'conversations.replies': thread({ ts: '1700000001.000000', user: 'U1', text: 'JetBrains/kotlin' }),
  });
  const run = await ask([QUESTION, ...FAST], { SLACK_API: api });
  assert.equal(run.code, 0, run.stderr);
  const post = calls.find((c) => c.method === 'chat.postMessage')!;
  assert.deepEqual(post.body, { channel: 'C1', text: QUESTION });
  assert.equal(post.authorization, 'Bearer xoxb-test');
  assert.match(run.stderr, /^Asked in Slack: https:\/\/example\.slack\.com\/archives\/C1\/p1700000000000100$/m);
  assert.deepEqual(calls.find((c) => c.method === 'conversations.replies')!.body, { channel: 'C1', ts: TS });
});

test('the answer: the replies in the thread, oldest first, each <user>: <text> on stdout, exit 0', async (t) => {
  const { api } = await slack(t, {
    'chat.postMessage': posted,
    'chat.getPermalink': permalink,
    'conversations.replies': thread(
      { ts: '1700000003.000000', user: 'U2', text: 'and keep the filter' },
      { ts: '1700000002.000000', user: 'U1', text: 'JetBrains/kotlin' },
    ),
  });
  const run = await ask([QUESTION, ...FAST], { SLACK_API: api });
  assert.equal(run.code, 0, run.stderr);
  assert.equal(run.stdout, 'U1: JetBrains/kotlin\nU2: and keep the filter\n');
});

test('each reply read is marked with a funny emoji reaction, one from REACTIONS', async (t) => {
  const { api, calls } = await slack(t, {
    'chat.postMessage': posted,
    'chat.getPermalink': permalink,
    'conversations.replies': thread(
      { ts: '1700000002.000000', user: 'U1', text: 'JetBrains/kotlin' },
      { ts: '1700000003.000000', user: 'U2', text: 'and keep the filter' },
      { ts: '1700000004.000000', ...BOT, text: 'the bot again' },
    ),
    'reactions.add': () => ({ body: { ok: true } }),
  });
  const run = await ask([QUESTION, ...FAST], { SLACK_API: api });
  assert.equal(run.code, 0, run.stderr);
  const reactions = calls.filter((c) => c.method === 'reactions.add');
  assert.deepEqual(reactions.map((c) => [c.body.channel, c.body.timestamp]), [['C1', '1700000002.000000'], ['C1', '1700000003.000000']]);
  for (const c of reactions) assert.ok(REACTIONS.includes(c.body.name), c.body.name);
  assert.doesNotMatch(run.stderr, /warning/);
});

test('a reaction that fails, no reactions:write scope, is a warning: the answer stands', async (t) => {
  const { api } = await slack(t, {
    'chat.postMessage': posted,
    'chat.getPermalink': permalink,
    'conversations.replies': thread({ ts: '1700000002.000000', user: 'U1', text: 'yes' }),
    'reactions.add': () => ({ body: { ok: false, error: 'missing_scope' } }),
  });
  const run = await ask([QUESTION, ...FAST], { SLACK_API: api });
  assert.equal(run.code, 0, run.stderr);
  assert.equal(run.stdout, 'U1: yes\n');
  assert.match(run.stderr, /^warning: could not mark the reply 1700000002\.000000 as read: missing_scope$/m);
});

test('it waits until the first reply, checking every --poll', async (t) => {
  const { api, calls } = await slack(t, {
    'chat.postMessage': posted,
    'chat.getPermalink': permalink,
    'conversations.replies': after(3, { ts: '1700000002.000000', user: 'U1', text: 'yes' }),
  });
  const run = await ask([QUESTION, '--wait', '1', '--poll', '0.05'], { SLACK_API: api });
  assert.equal(run.code, 0, run.stderr);
  assert.equal(run.stdout, 'U1: yes\n');
  assert.equal(calls.filter((c) => c.method === 'conversations.replies').length, 4);
});

test("the bot's own messages in the thread are not an answer", async (t) => {
  const { api } = await slack(t, {
    'chat.postMessage': posted,
    'chat.getPermalink': permalink,
    'conversations.replies': thread(
      { ts: '1700000002.000000', bot_id: 'B1', text: 'a follow-up from the bot' },
      { ts: '1700000003.000000', user: 'U0BOT', text: 'the bot again' },
    ),
  });
  const run = await ask([QUESTION, ...FAST], { SLACK_API: api });
  assert.equal(run.code, 1);
  assert.equal(run.stdout, '');
});

test('no reply in --wait minutes: No answer in <N> minutes on stderr, exit 1', async (t) => {
  const { api, calls } = await slack(t, { 'chat.postMessage': posted, 'chat.getPermalink': permalink, 'conversations.replies': thread() });
  const started = Date.now();
  const run = await ask([QUESTION, '--wait', '0.01', '--poll', '0.2'], { SLACK_API: api });
  assert.equal(run.code, 1);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /^No answer in 0\.01 minutes$/m);
  assert.ok(Date.now() - started >= 600, 'it waited the whole --wait');
  assert.ok(calls.some((c) => c.method === 'conversations.replies'), 'it looked at the end of the wait');
});

test('a check that fails, a rate limit or an error, is a warning, and the wait goes on', async (t) => {
  const { api } = await slack(t, {
    'chat.postMessage': posted,
    'chat.getPermalink': permalink,
    'conversations.replies': (body, nth) =>
      nth === 0
        ? { status: 429, body: {} }
        : nth === 1
          ? { status: 500, body: {} }
          : nth === 2
            ? { body: { ok: false, error: 'ratelimited' } }
            : thread({ ts: '1700000002.000000', user: 'U1', text: 'yes' })(body, nth),
  });
  const run = await ask([QUESTION, '--wait', '1', '--poll', '0.05'], { SLACK_API: api });
  assert.equal(run.code, 0, run.stderr);
  assert.equal(run.stdout, 'U1: yes\n');
  assert.equal(run.stderr.match(/^warning: could not read the thread/gm)?.length, 3);
});

for (const error of ['invalid_auth', 'account_inactive', 'token_revoked', 'not_in_channel']) {
  test(`Slack refuses the thread for good, ${error}: its error, exit 1 at once`, async (t) => {
    const { api, calls } = await slack(t, {
      'chat.postMessage': posted,
      'chat.getPermalink': permalink,
      'conversations.replies': () => ({ body: { ok: false, error } }),
    });
    const run = await ask([QUESTION, '--wait', '1', '--poll', '0.05'], { SLACK_API: api });
    assert.equal(run.code, 1);
    assert.match(run.stderr, new RegExp(`^Slack refused to show the thread: ${error}$`, 'm'));
    assert.equal(calls.filter((c) => c.method === 'conversations.replies').length, 1);
  });
}

for (const [name, args, env, message] of [
  ['no question', [], {}, /^no question$/m],
  ['a blank question', ['  '], {}, /^no question$/m],
  ['two questions', [QUESTION, 'another'], {}, /^one question at a time$/m],
  ['a bad --wait', [QUESTION, '--wait', 'soon'], {}, /^--wait needs a positive number$/m],
  ['a missing --poll', [QUESTION, '--poll'], {}, /^--poll needs a positive number$/m],
  ['an unknown option', [QUESTION, '--channel', 'C2'], {}, /^unknown option: --channel$/m],
  ['no SLACK_BOT_TOKEN', [QUESTION], { SLACK_BOT_TOKEN: '' }, /^SLACK_BOT_TOKEN is not set/m],
  ['no CHANNEL_ID', [QUESTION], { CHANNEL_ID: undefined }, /^CHANNEL_ID is not set/m],
] as const) {
  test(`${name}: a clear message, exit 2, nothing posted`, async (t) => {
    const { api, calls } = await slack(t, { 'chat.postMessage': posted });
    const run = await ask([...args], { SLACK_API: api, ...env });
    assert.equal(run.code, 2);
    assert.match(run.stderr, message);
    assert.deepEqual(calls, []);
  });
}

test('Slack refuses the question: its error, exit 2', async (t) => {
  const { api, calls } = await slack(t, { 'chat.postMessage': () => ({ body: { ok: false, error: 'not_in_channel' } }) });
  const run = await ask([QUESTION, ...FAST], { SLACK_API: api });
  assert.equal(run.code, 2);
  assert.match(run.stderr, /^Slack refused the question: not_in_channel$/m);
  assert.deepEqual(calls.map((c) => c.method), ['chat.postMessage']);
});

test('Slack out of reach for the question: its error, exit 2', async () => {
  // A port that was free a moment ago: nobody answers there.
  const closed = createServer();
  await new Promise<void>((done) => closed.listen(0, '127.0.0.1', done));
  const port = (closed.address() as AddressInfo).port;
  await new Promise((done) => closed.close(done));
  const run = await ask([QUESTION, ...FAST], { SLACK_API: `http://127.0.0.1:${port}` });
  assert.equal(run.code, 2);
  assert.match(run.stderr, /^Slack is out of reach: /m);
});
