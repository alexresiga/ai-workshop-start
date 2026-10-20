// "What is a project skill" in spec/analysis.md: SKILL.md files with identical text are one skill.
// Each case is a small repository, scanned as a local directory and through GitHub; both must agree.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { atlas, directory, scanBothWays, skill } from './helpers.ts';

type Case = {
  name: string;
  files: Record<string, string>;
  /** Each skill: its path, its name and its copies. */
  skills: [string, string, string[]][];
  warnings?: string[];
};

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

for (const c of CASES) {
  test(c.name, async (t) => {
    const expected = { skills: c.skills, warnings: c.warnings ?? [] };
    const scanned = await scanBothWays(t, c.files);
    assert.deepEqual(scanned.local, expected, 'local');
    assert.deepEqual(scanned.github, expected, 'GitHub');
  });
}

test('scan prints the copies: also in <paths>', async (t) => {
  const root = directory(t, CASES[3].files);
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
