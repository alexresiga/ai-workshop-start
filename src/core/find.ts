/** A skill found in a repository: its SKILL.md, its name and its copies. */
export type SkillFile = { path: string; name: string; copies: string[] };

/** Where agents keep a repository's own skills. */
export const SKILL_ROOTS = ['.agents/skills', '.claude/skills', '.github/skills', 'agent/skills'];

/** The skill root every agent reads, not one agent's own. */
export const GENERAL_ROOT = '.agents/skills';

/**
 * Every file named exactly SKILL.md, named after its directory (a SKILL.md at the
 * root after the repository). Nothing is ignored here: the scan merges identical copies.
 */
export function findSkills(paths: string[], repositoryName: string): SkillFile[] {
  return paths
    .filter((path) => path.split('/').at(-1) === 'SKILL.md')
    .sort()
    .map((path) => ({ path, name: path.split('/').at(-2) ?? repositoryName, copies: [] }));
}
