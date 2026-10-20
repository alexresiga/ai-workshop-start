// "What is a project skill" in spec/analysis.md: SKILL.md files with identical text are one skill.
// Each case is a small repository, scanned as a local directory and through GitHub; both must agree.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { openGitHub } from '../src/core/github.ts';
import { replay, type Recording } from '../src/core/replay.ts';
import { scan, type ScanResult } from '../src/core/scan.ts';
import { openDirectory } from '../src/local.ts';
import { atlas } from './helpers.ts';

type Case = {
  name: string;
  files: Record<string, string>;
  /** Each skill: its path, its name and its copies. */
  skills: [string, string, string[]][];
  warnings?: string[];
};

const skill = (name: string) => `---\nname: ${name}\ndescription: Run the ${name}.\n---\n# ${name}\n`;
const MPS = skill('mps-tests');

const CASES: Case[] = [
  {
    name: 'identical in .agents and .claude → one skill, the general one, the other a copy',
    files: { '.agents/skills/mps-tests/SKILL.md': MPS, '.claude/skills/mps-tests/SKILL.md': MPS },
    skills: [['.agents/skills/mps-tests/SKILL.md', 'mps-tests', ['.claude/skills/mps-tests/SKILL.md']]],
  },
  {
    name: 'the general one is kept even when another path sorts first',
    files: { '.agent/skills/mps-tests/SKILL.md': MPS, '.agents/skills/mps-tests/SKILL.md': MPS },
    skills: [['.agents/skills/mps-tests/SKILL.md', 'mps-tests', ['.agent/skills/mps-tests/SKILL.md']]],
  },
  {
    name: 'no general one → the first by path',
    files: { '.github/skills/mps-tests/SKILL.md': MPS, '.claude/skills/mps-tests/SKILL.md': MPS },
    skills: [['.claude/skills/mps-tests/SKILL.md', 'mps-tests', ['.github/skills/mps-tests/SKILL.md']]],
  },
  {
    name: 'every agent has a copy → one skill, the copies sorted',
    files: {
      '.github/skills/mps-tests/SKILL.md': MPS,
      '.claude/skills/mps-tests/SKILL.md': MPS,
      '.agents/skills/mps-tests/SKILL.md': MPS,
    },
    skills: [['.agents/skills/mps-tests/SKILL.md', 'mps-tests', ['.claude/skills/mps-tests/SKILL.md', '.github/skills/mps-tests/SKILL.md']]],
  },
  {
    name: 'a generated copy differs by a line → skills of their own (JetBrains/intellij-community)',
    files: {
      '.agents/skills/commits/SKILL.md': skill('commits'),
      '.claude/skills/commits/SKILL.md': skill('commits').replace('---\n#', '---\n<!-- Generated; edit .agents/skills/commits/SKILL.md -->\n#'),
    },
    skills: [
      ['.agents/skills/commits/SKILL.md', 'commits', []],
      ['.claude/skills/commits/SKILL.md', 'commits', []],
    ],
  },
  {
    name: 'line endings differ → skills of their own',
    files: { '.agents/skills/mps-tests/SKILL.md': MPS, '.claude/skills/mps-tests/SKILL.md': MPS.replaceAll('\n', '\r\n') },
    skills: [
      ['.agents/skills/mps-tests/SKILL.md', 'mps-tests', []],
      ['.claude/skills/mps-tests/SKILL.md', 'mps-tests', []],
    ],
  },
  {
    name: 'identical text in directories of other names → one skill, named by the one kept',
    files: { '.agents/skills/mps-tests/SKILL.md': MPS, '.claude/skills/mps/SKILL.md': MPS },
    skills: [['.agents/skills/mps-tests/SKILL.md', 'mps-tests', ['.claude/skills/mps/SKILL.md']]],
  },
  {
    name: 'malformed and identical → one warning, for the one kept',
    files: { '.agents/skills/broken/SKILL.md': '---\nname\n---\n', '.claude/skills/broken/SKILL.md': '---\nname\n---\n' },
    skills: [['.agents/skills/broken/SKILL.md', 'broken', ['.claude/skills/broken/SKILL.md']]],
    warnings: ['.agents/skills/broken/SKILL.md: front matter is not a mapping; using the directory name'],
  },
];

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

/** What GitHub answers for the case, through code search. */
function github(id: string, files: Record<string, string>): Recording {
  const recording: Recording = {
    [`https://api.github.com/repos/${id}`]: { status: 200, body: { full_name: id, default_branch: 'main' } },
    [`https://api.github.com/repos/${id}/commits/main`]: { status: 200, body: { sha: COMMIT } },
    [`https://api.github.com/search/code?q=filename:SKILL.md+repo:${id}&per_page=100&page=1`]: {
      status: 200,
      body: { total_count: Object.keys(files).length, items: Object.keys(files).map((path) => ({ path })) },
    },
  };
  for (const [path, text] of Object.entries(files)) {
    recording[`https://raw.githubusercontent.com/${id}/${COMMIT}/${path}`] = { status: 200, body: text };
  }
  return recording;
}

function local(t: { after(fn: () => void): void }, files: Record<string, string>): string {
  const root = join(mkdtempSync(join(tmpdir(), 'skill-atlas-')), 'repo');
  t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

const summary = ({ skills, warnings }: ScanResult) => ({ skills: skills.map((skill) => [skill.path, skill.name, skill.copies]), warnings });

for (const c of CASES) {
  test(c.name, async (t) => {
    const expected = { skills: c.skills, warnings: c.warnings ?? [] };
    assert.deepEqual(summary(await scan(await openDirectory(local(t, c.files)))), expected, 'local');
    const id = 'example/copies';
    const remote = await scan(await openGitHub(`https://github.com/${id}`, { fetch: replay(github(id, c.files)), token: 't' }));
    assert.deepEqual(summary(remote), expected, 'GitHub');
  });
}

test('scan prints the copies: also in <paths>', async (t) => {
  const root = local(t, CASES[3].files);
  const scanned = await atlas(['scan', root]);
  assert.equal(scanned.code, 0, scanned.stderr);
  assert.equal(
    scanned.stdout,
    [
      'repo · 1 skill',
      'mps-tests — Run the mps-tests.',
      `  file://${root}/.agents/skills/mps-tests/SKILL.md`,
      '  also in .claude/skills/mps-tests/SKILL.md, .github/skills/mps-tests/SKILL.md',
    ].join('\n'),
  );
});
