// Runs the commands the way the CLI does, with GitHub answering from EXAMPLE below; and scans small
// repositories written for a test, as a local directory and through GitHub.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../src/commands.ts';
import { openGitHub, parseGitHubUrl } from '../src/core/github.ts';
import { replay, type Recording } from '../src/core/replay.ts';
import { scan, type ScanResult } from '../src/core/scan.ts';
import { openDirectory } from '../src/local.ts';

export const FIXTURE = fileURLToPath(new URL('../fixture', import.meta.url));
/** This repository: its own fixture is not a skill. */
export const REPOSITORY = fileURLToPath(new URL('..', import.meta.url));
export const CLI = fileURLToPath(new URL('../src/cli.ts', import.meta.url));

/** The commit GitHub answers for JetBrains/example. */
export const EXAMPLE_COMMIT = '5ab6270ab772d113e8ad52ebfcaa0109c522ae00';

/** What GitHub answers for a small repository, JetBrains/example, with one skill. */
const EXAMPLE: Recording = {
  'https://api.github.com/repos/JetBrains/example': { status: 200, body: { full_name: 'JetBrains/example', default_branch: 'main' } },
  'https://api.github.com/repos/JetBrains/example/commits/main': { status: 200, body: { sha: EXAMPLE_COMMIT } },
  'https://api.github.com/search/code?q=filename:SKILL.md+repo:JetBrains/example&per_page=100&page=1': {
    status: 200,
    body: { total_count: 1, items: [{ path: '.claude/skills/commits/SKILL.md' }] },
  },
  [`https://raw.githubusercontent.com/JetBrains/example/${EXAMPLE_COMMIT}/.claude/skills/commits/SKILL.md`]: {
    status: 200,
    body: '---\nname: commits\ndescription: Write commit messages the way this repository does. Use for every commit.\n---\n# Commits\n',
  },
};

/** GitHub, answering from EXAMPLE. */
export const github = replay(EXAMPLE);

/** `skill-atlas <args>`, as the CLI runs it, with GitHub answering from EXAMPLE. */
export async function atlas(args: string[]) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const code = await run(args, {
    // With a token, through code search, as EXAMPLE answers it.
    open: (input) => (parseGitHubUrl(input) ? openGitHub(input, { fetch: github, token: 'test' }) : openDirectory(input)),
    print: (text) => stdout.push(text),
    error: (text) => stderr.push(text),
  });
  return { code, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
}

/** A repository written for a test: each file's path and text. */
export type Files = Record<string, string>;

/** A SKILL.md with a name and a description. */
export const skill = (name: string) => `---\nname: ${name}\ndescription: Run the ${name}.\n---\n# ${name}\n`;

/** The files in a new directory, removed after the test. */
export function directory(t: { after(fn: () => void): void }, files: Files): string {
  const root = join(mkdtempSync(join(tmpdir(), 'skill-atlas-')), 'repo');
  t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

/** What GitHub answers for the files, through code search. */
export function searchAnswers(id: string, files: Files): Recording {
  const skills = Object.keys(files).filter((path) => path.split('/').at(-1) === 'SKILL.md');
  const recording: Recording = {
    [`https://api.github.com/repos/${id}`]: { status: 200, body: { full_name: id, default_branch: 'main' } },
    [`https://api.github.com/repos/${id}/commits/main`]: { status: 200, body: { sha: COMMIT } },
    [`https://api.github.com/search/code?q=filename:SKILL.md+repo:${id}&per_page=100&page=1`]: {
      status: 200,
      body: { total_count: skills.length, items: skills.map((path) => ({ path })) },
    },
  };
  for (const [path, text] of Object.entries(files)) {
    recording[`https://raw.githubusercontent.com/${id}/${COMMIT}/${path}`] = { status: 200, body: text };
  }
  return recording;
}

/** Each skill as its path, name and copies; and the warnings. */
export type Summary = { skills: [string, string, string[]][]; warnings: string[] };

const summary = ({ skills, warnings }: ScanResult): Summary => ({
  skills: skills.map((skill) => [skill.path, skill.name, skill.copies]),
  warnings,
});

/** The files scanned as a local directory and through GitHub: both must find the same. */
export async function scanBothWays(t: { after(fn: () => void): void }, files: Files): Promise<{ local: Summary; github: Summary }> {
  const id = 'example/repo';
  return {
    local: summary(await scan(await openDirectory(directory(t, files)))),
    github: summary(await scan(await openGitHub(`https://github.com/${id}`, { fetch: replay(searchAnswers(id, files)), token: 't' }))),
  };
}
