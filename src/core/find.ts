/** A skill found in a repository: its SKILL.md, its name and its copies. */
export type SkillFile = { path: string; name: string; copies: string[] };

/** Where agents keep a repository's own skills. */
export const SKILL_ROOTS = ['.agents/skills', '.claude/skills', '.github/skills', 'agent/skills'];

/** The skill root every agent reads, not one agent's own. */
export const GENERAL_ROOT = '.agents/skills';

/** Folders of test data: a SKILL.md in one is a fixture for the project's own tests, not a skill. */
const FIXTURE_FOLDERS = new Set(['fixture', 'fixtures', '__fixtures__', 'testData', 'testdata', 'test-data']);

/**
 * Every file named exactly SKILL.md, named after its directory (a SKILL.md at the root after the
 * repository), but for what is not the project's own skill: a SKILL.md in a fixture folder. The scan
 * merges identical copies.
 */
export function findSkills(paths: string[], repositoryName: string): SkillFile[] {
  return paths
    .filter((path) => path.split('/').at(-1) === 'SKILL.md' && !folders(path).some((folder) => FIXTURE_FOLDERS.has(folder)))
    .sort()
    .map((path) => ({ path, name: path.split('/').at(-2) ?? repositoryName, copies: [] }));
}

/** The folders a SKILL.md is in; in a `skills` folder, its own is the skill's name, so a skill may be named `fixtures`. */
function folders(path: string): string[] {
  const folders = path.split('/').slice(0, -1);
  return folders.at(-2) === 'skills' ? folders.slice(0, -1) : folders;
}
