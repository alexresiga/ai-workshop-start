import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AtlasError } from './core/errors.ts';

/** The small model the skills are clustered with. */
export const MODEL = 'haiku';

/** How long the model may take: longer, and it is stopped. */
export const TIMEOUT = 5 * 60_000;

/** How long `claude` has to stop on SIGTERM before it is killed. */
export const GRACE = 5_000;

/**
 * Tools for the model: none. The question carries descriptions from any repository on GitHub, so
 * no built-in tool, and no MCP server, the operator's own included. The answer streamed, one JSON a
 * line, its text as it comes, so the page can show how far it is.
 */
export const ARGS = [
  '-p',
  '--model',
  MODEL,
  '--output-format',
  'stream-json',
  '--verbose',
  '--include-partial-messages',
  '--no-session-persistence',
  '--tools',
  '',
  '--strict-mcp-config',
  '--disallowedTools',
  'mcp__*',
];

export type AskOptions = {
  /** `CLAUDE`, else `claude` on the PATH. */
  binary?: string;
  timeout?: number;
  grace?: number;
  /** Aborted when no one waits for the answer any more: `claude` is stopped. */
  signal?: AbortSignal;
  /** Hears the model's text so far, each time more of it comes. */
  partial?: (text: string) => void;
};

/** A line of `claude -p --output-format stream-json`: the events this reads, the others ignored. */
type StreamLine = {
  type?: unknown;
  result?: unknown;
  is_error?: unknown;
  event?: { type?: unknown; delta?: { type?: unknown; text?: unknown } };
};

/**
 * Asks Claude Code, `claude -p`, with no tools and no session kept, in an empty directory of its
 * own, so no project's CLAUDE.md, settings or MCP servers are found: the prompt on stdin, the
 * answer from its last `result` line; `partial` hears the text as it streams. Not there, an error,
 * too long, or aborted → an AtlasError.
 */
export function askClaude(prompt: string, options: AskOptions = {}): Promise<string> {
  const { binary = process.env.CLAUDE || 'claude', timeout = TIMEOUT, grace = GRACE, signal, partial } = options;
  if (signal?.aborted) return Promise.reject(new AtlasError('No one is waiting for the clusters'));
  const cwd = mkdtempSync(join(tmpdir(), 'skill-atlas-claude-'));
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, ARGS, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let stopped = false;
    // The lines read so far: the text streamed, and the last `result`; `pending`, a line not ended yet.
    let pending = '';
    let text = '';
    let answer: StreamLine | undefined;
    const read = (line: string) => {
      let data: StreamLine;
      try {
        data = JSON.parse(line);
      } catch {
        return;
      }
      if (data?.type === 'result') answer = data;
      const delta = data?.type === 'stream_event' && data.event?.type === 'content_block_delta' ? data.event.delta : undefined;
      if (delta?.type === 'text_delta' && typeof delta.text === 'string' && delta.text) {
        text += delta.text;
        if (!stopped) partial?.(text);
      }
    };
    // Settled at once, not on close: a claude that ignores SIGTERM, or a process it started that
    // still holds its stdout, would keep close from ever coming.
    const stop = (reason: AtlasError) => {
      stopped = true;
      child.kill();
      setTimeout(() => child.exitCode === null && child.signalCode === null && child.kill('SIGKILL'), grace).unref();
      child.stdout.destroy();
      child.stderr.destroy();
      done();
      reject(reason);
    };
    const timer = setTimeout(() => stop(new AtlasError(`${binary} took too long to cluster the skills`)), timeout);
    timer.unref();
    const aborted = () => stop(new AtlasError('No one is waiting for the clusters'));
    signal?.addEventListener('abort', aborted, { once: true });
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      rmSync(cwd, { recursive: true, force: true });
    };
    // Decoded as streams, not chunk by chunk: a character split between two chunks stays whole.
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      const lines = (pending + chunk).split('\n');
      pending = lines.pop()!;
      lines.forEach(read);
    });
    child.stderr.on('data', (chunk) => (stderr += chunk));
    // A child that exits before reading the prompt closes stdin: its exit says what went wrong.
    child.stdin.on('error', () => {});
    child.on('error', (error: NodeJS.ErrnoException) => {
      done();
      reject(
        new AtlasError(
          error.code === 'ENOENT'
            ? `Cannot run ${binary}: clustering needs Claude Code (claude) on the PATH, or CLAUDE set to it`
            : `Cannot run ${binary}: ${error.message}`,
        ),
      );
    });
    // Done when it exits: what it wrote has a moment to drain, then the pipes are let go, in case
    // a process it started holds them, and close comes with the answer as received.
    child.on('exit', () => {
      setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
      }, Math.min(grace, 1000)).unref();
    });
    child.on('close', (code) => {
      if (stopped) return;
      done();
      read(pending);
      if (answer && typeof answer.result === 'string' && !answer.is_error && code === 0) resolve(answer.result);
      else {
        const reason = (typeof answer?.result === 'string' && answer.result) || stderr.trim() || stdout.trim() || `exit code ${code}`;
        reject(new AtlasError(`${binary} could not cluster the skills: ${reason.split('\n')[0]}`));
      }
    });
    child.stdin.end(prompt);
  });
}
