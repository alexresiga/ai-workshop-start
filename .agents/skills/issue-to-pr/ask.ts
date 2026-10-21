// spec/ask.md: asks a question in the Slack channel, waits for a reply in its thread, and prints the answer.

type Options = { question: string; wait: number; poll: number };
type Message = { ts: string; text?: string; user?: string; bot_id?: string; username?: string };
type Answer = { ok: boolean; error?: string; [key: string]: unknown };

/** Errors a later check cannot get past: no answer can come. */
const FATAL = ['invalid_auth', 'account_inactive', 'token_revoked', 'not_authed', 'missing_scope', 'not_in_channel', 'channel_not_found'];

const USAGE = 'usage: node .agents/skills/issue-to-pr/ask.ts "<question>" [--wait <minutes>] [--poll <seconds>]';

/** The command line, or the reason it is wrong. */
export function parse(args: string[]): Options | string {
  const options = { question: '', wait: 15, poll: 30 };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--wait' || arg === '--poll') {
      const value = Number(args[++i]);
      if (!(value > 0)) return `${arg} needs a positive number`;
      options[arg === '--wait' ? 'wait' : 'poll'] = value;
    } else if (arg.startsWith('--')) return `unknown option: ${arg}`;
    else if (options.question) return 'one question at a time';
    else options.question = arg;
  }
  return options.question.trim() ? options : 'no question';
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

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

export async function main(args: string[], env = process.env): Promise<number> {
  const options = parse(args);
  if (typeof options === 'string') {
    console.error(`${options}\n${USAGE}`);
    return 2;
  }
  const token = env.SLACK_BOT_TOKEN;
  const channel = env.CHANNEL_ID;
  if (!token || !channel) {
    console.error(`${!token ? 'SLACK_BOT_TOKEN' : 'CHANNEL_ID'} is not set: it is needed to ask in Slack`);
    return 2;
  }
  const api = (env.SLACK_API || 'https://slack.com/api').replace(/\/$/, '');

  let posted: Answer;
  try {
    posted = await slack(api, token, 'chat.postMessage', { channel, text: options.question });
  } catch (error) {
    console.error(`Slack is out of reach: ${(error as Error).message}`);
    return 2;
  }
  if (!posted.ok) {
    console.error(`Slack refused the question: ${posted.error}`);
    return 2;
  }
  const ts = posted.ts as string;
  const asker = posted.message as Message | undefined;
  const mine = (m: Message) => (!!asker?.bot_id && m.bot_id === asker.bot_id) || (!!asker?.user && m.user === asker.user);
  const link = await slack(api, token, 'chat.getPermalink', { channel, message_ts: ts }).catch(() => undefined);
  console.error(`Asked in Slack: ${link?.ok ? link.permalink : `${channel} at ${ts}`}`);

  const deadline = Date.now() + options.wait * 60_000;
  for (;;) {
    await sleep(Math.max(0, Math.min(options.poll * 1000, deadline - Date.now())));
    try {
      const thread = await slack(api, token, 'conversations.replies', { channel, ts });
      if (!thread.ok && FATAL.includes(thread.error!)) {
        console.error(`Slack refused to show the thread: ${thread.error}`);
        return 1;
      }
      if (!thread.ok) throw new Error(thread.error);
      const replies = ((thread.messages ?? []) as Message[])
        .filter((m) => m.ts !== ts && !mine(m))
        .sort((a, b) => Number(a.ts) - Number(b.ts));
      if (replies.length) {
        for (const m of replies) console.log(`${m.user ?? m.username ?? m.bot_id ?? 'someone'}: ${m.text ?? ''}`);
        return 0;
      }
    } catch (error) {
      console.error(`warning: could not read the thread: ${(error as Error).message}`);
    }
    if (Date.now() >= deadline) {
      console.error(`No answer in ${options.wait} minutes`);
      return 1;
    }
  }
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
