// "What is a project skill" in spec/analysis.md: where the repository's own skills are, and what is
// not one. Each case is a small repository, scanned as a local directory and through GitHub.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanBothWays, skill, type Files } from './helpers.ts';

type Case = {
  name: string;
  files: Files;
  /** The paths of the skills found. */
  skills: string[];
};

const CASES: Case[] = [
  {
    name: 'the repository’s own workflow outside .agents and .claude: other agents’ folders',
    files: {
      '.agents/skills/a/SKILL.md': skill('a'),
      '.claude/skills/b/SKILL.md': skill('b'),
      '.github/skills/c/SKILL.md': skill('c'),
      '.cursor/skills/d/SKILL.md': skill('d'),
      'agent/skills/e/SKILL.md': skill('e'),
    },
    skills: ['.agents/skills/a/SKILL.md', '.claude/skills/b/SKILL.md', '.github/skills/c/SKILL.md', '.cursor/skills/d/SKILL.md', 'agent/skills/e/SKILL.md'],
  },
  {
    name: 'the repository’s own workflow outside .agents and .claude: a subproject, a folder of its own, the root',
    files: {
      'community/.agents/skills/a/SKILL.md': skill('a'),
      'tools/release/SKILL.md': skill('release'),
      'SKILL.md': skill('repo'),
    },
    skills: ['community/.agents/skills/a/SKILL.md', 'SKILL.md', 'tools/release/SKILL.md'],
  },
];

for (const c of CASES) {
  test(c.name, async (t) => {
    const scanned = await scanBothWays(t, c.files);
    const paths = (summary: typeof scanned.local) => summary.skills.map(([path]) => path).sort();
    assert.deepEqual(paths(scanned.local), [...c.skills].sort(), 'local');
    assert.deepEqual(paths(scanned.github), [...c.skills].sort(), 'GitHub');
  });
}
