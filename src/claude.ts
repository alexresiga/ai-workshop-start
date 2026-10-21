import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AtlasError } from './core/errors.ts';

/** The small model the skills are clustered with. */
export const MODEL = 'haiku';

/** How long the model may take: longer, and it is stopped. */
export const TIMEOUT = 5 * 60_000;

/**
 * Tools for the model: none. The question carries descriptions from any repository on GitHub, so
 * no built-in tool, and no MCP server, the operator's own included.
 */
export const ARGS = [
  '-p',
  '--model',
  MODEL,
  '--output-format',
  'json',
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
  /** Aborted when no one waits for the answer any more: `claude` is stopped. */
  signal?: AbortSignal;
};

/**
 * Asks Claude Code, `claude -p`, with no tools and no session kept, in an empty directory of its
 * own, so no project's CLAUDE.md, settings or MCP servers are found: the prompt on stdin, the
 * answer from its JSON. Not there, an error, too long, or aborted → an AtlasError.
 */
export function askClaude(prompt: string, options: AskOptions = {}): Promise<string> {
  const { binary = process.env.CLAUDE || 'claude', timeout = TIMEOUT, signal } = options;
  if (signal?.aborted) return Promise.reject(new AtlasError('No one is waiting for the clusters'));
  const cwd = mkdtempSync(join(tmpdir(), 'skill-atlas-claude-'));
  return new Promise<string>((resolve, reject) => {
    const child = spawn(binary, ARGS, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let stopped: AtlasError | undefined;
    const stop = (reason: AtlasError) => {
      stopped = reason;
      child.kill();
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
    child.stdout.on('data', (chunk) => (stdout += chunk));
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
    child.on('close', (code) => {
      done();
      if (stopped) return reject(stopped);
      let answer: { result?: unknown; is_error?: unknown } | undefined;
      try {
        answer = JSON.parse(stdout);
      } catch {
        answer = undefined;
      }
      if (answer && typeof answer.result === 'string' && !answer.is_error && code === 0) resolve(answer.result);
      else {
        const reason = (typeof answer?.result === 'string' && answer.result) || stderr.trim() || stdout.trim() || `exit code ${code}`;
        reject(new AtlasError(`${binary} could not cluster the skills: ${reason.split('\n')[0]}`));
      }
    });
    child.stdin.end(prompt);
  });
}
