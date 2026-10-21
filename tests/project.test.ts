// "What is a project skill" in spec/analysis.md: where the repository's own skills are, and what is
// not one. Each case is a small repository, scanned as a local directory and through GitHub.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { atlas, REPOSITORY, scanBothWays, skill, type Files } from './helpers.ts';

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
      'agent/skills/writing-lint-checks/SKILL.md': skill('writing-lint-checks'), // JetBrains/android
    },
    skills: ['.agents/skills/a/SKILL.md', '.claude/skills/b/SKILL.md', '.github/skills/c/SKILL.md', '.cursor/skills/d/SKILL.md', 'agent/skills/writing-lint-checks/SKILL.md'],
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
  {
    name: 'skip a fixture for the project’s own tests, not a skill',
    files: {
      '.agents/skills/a/SKILL.md': skill('a'),
      'fixture/.claude/skills/commits/SKILL.md': skill('commits'),
      'src/test/fixtures/skills/x/SKILL.md': skill('x'),
      'core/__fixtures__/SKILL.md': skill('y'),
      'plugin/testData/skills/z/SKILL.md': skill('z'),
      'plugin/testdata/w/SKILL.md': skill('w'),
      'lib/test-data/v/SKILL.md': skill('v'),
    },
    skills: ['.agents/skills/a/SKILL.md'],
  },
  {
    name: 'a skill named after a fixture folder is still a skill',
    files: { '.claude/skills/fixtures/SKILL.md': skill('fixtures'), '.agents/skills/testData/SKILL.md': skill('testData') },
    skills: ['.agents/skills/testData/SKILL.md', '.claude/skills/fixtures/SKILL.md'],
  },
  {
    name: 'skip skills which are shipped as part of the product (JetBrains/MPS)',
    files: {
      '.agents/skills/a/SKILL.md': skill('a'),
      'plugins/mcp-tools/resources/jetbrains/mps/agents/mcp/skills/mps-console/SKILL.md': skill('mps-console'),
      'plugin/src/main/resources/skills/b/SKILL.md': skill('b'),
      'app/resources/SKILL.md': skill('c'),
    },
    skills: ['.agents/skills/a/SKILL.md'],
  },
  {
    name: 'a skill named resources is still a skill',
    files: { '.claude/skills/resources/SKILL.md': skill('resources') },
    skills: ['.claude/skills/resources/SKILL.md'],
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

test('this repository: its fixture is not a skill', async () => {
  const scanned = await atlas(['scan', REPOSITORY]);
  assert.equal(scanned.code, 0, scanned.stderr);
  assert.match(scanned.stdout, /^[^\n]+ · 5 skills\n/);
  assert.match(scanned.stdout, /\.agents\/skills\/code-review\/SKILL\.md$/m);
  assert.match(scanned.stdout, /\.agents\/skills\/address-review\/SKILL\.md$/m);
  assert.match(scanned.stdout, /\.agents\/skills\/issue-to-pr\/SKILL\.md$/m);
  assert.match(scanned.stdout, /\.agents\/skills\/record-feature\/SKILL\.md$/m);
  assert.match(scanned.stdout, /\.agents\/skills\/red-agent\/SKILL\.md$/m);
  assert.doesNotMatch(scanned.stdout, /fixture\//);
});
