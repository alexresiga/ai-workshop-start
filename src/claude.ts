import { spawn } from 'node:child_process';
import { AtlasError } from './core/errors.ts';

/** The small model the skills are clustered with. */
export const MODEL = 'haiku';

/**
 * Asks Claude Code, `claude -p`, with no tools and no session kept: the prompt on stdin, the answer
 * from its JSON. `CLAUDE` names another binary. Not there, or an error → an AtlasError.
 */
export function askClaude(prompt: string, binary = process.env.CLAUDE || 'claude'): Promise<string> {
  const args = ['-p', '--model', MODEL, '--output-format', 'json', '--no-session-persistence', '--tools', ''];
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    // A child that exits before reading the prompt closes stdin: its exit says what went wrong.
    child.stdin.on('error', () => {});
    child.on('error', (error: NodeJS.ErrnoException) =>
      reject(
        new AtlasError(
          error.code === 'ENOENT'
            ? `Cannot run ${binary}: clustering needs Claude Code (claude) on the PATH, or CLAUDE set to it`
            : `Cannot run ${binary}: ${error.message}`,
        ),
      ),
    );
    child.on('close', (code) => {
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
