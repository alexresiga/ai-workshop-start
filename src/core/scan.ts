import { findSkills, GENERAL_ROOT, type SkillFile } from './find.ts';
import { sortSkills, type Repository, type Skill } from './model.ts';
import { parseSkill } from './parse.ts';

/** A repository to scan: its files, and how to read them. */
export type Source = {
  repository: Repository;
  /** Every file path, relative to the repository root. */
  paths: string[];
  /** What listing the files had to leave out. */
  warnings: string[];
  /** The file's bytes, or undefined if it is not there. */
  read(path: string): Promise<Uint8Array | undefined>;
};

export type ScanResult = { repository: Repository; skills: Skill[]; warnings: string[] };

/** fetch → find → parse. Nothing is stored: the result is all there is. */
export async function scan(source: Source): Promise<ScanResult> {
  const files = findSkills(source.paths, source.repository.name);
  // The files are read at the same time: on GitHub, each one is a request.
  const read = await Promise.all(files.map(async (file) => ({ file, bytes: await source.read(file.path) })));
  const warnings = [...source.warnings];
  const texts = new Map<SkillFile, string>();
  for (const { file, bytes } of read) {
    if (bytes) texts.set(file, new TextDecoder().decode(bytes));
    else warnings.push(`${file.path}: listed, but not found at the scanned commit; skipped`);
  }
  const skills: Skill[] = [];
  for (const same of copies([...texts.keys()], texts)) {
    const [kept, ...others] = same.sort(byGenerality);
    const { skill, warning } = readSkill(source, { ...kept, copies: others.map((file) => file.path) }, texts.get(kept)!);
    skills.push(skill);
    if (warning) warnings.push(warning);
  }
  return { repository: source.repository, skills: sortSkills(skills), warnings };
}

/**
 * The files that are one skill: identical text, wherever it is; or the same name in the skills
 * folder of an agent's folder at the top of the repository, whatever the text.
 */
function copies(files: SkillFile[], texts: Map<SkillFile, string>): SkillFile[][] {
  // Union-find: each file starts alone, and each shared key joins two groups.
  const parent = files.map((_, index) => index);
  const root = (index: number): number => (parent[index] === index ? index : (parent[index] = root(parent[index])));
  const owners = new Map<string, number>();
  files.forEach((file, index) => {
    const name = agentSkillName(file.path);
    for (const key of [`text:${texts.get(file)}`, ...(name ? [`name:${name}`] : [])]) {
      const owner = owners.get(key);
      if (owner === undefined) owners.set(key, index);
      else parent[root(index)] = root(owner);
    }
  });
  const groups = new Map<number, SkillFile[]>();
  files.forEach((file, index) => groups.set(root(index), [...(groups.get(root(index)) ?? []), file]));
  return [...groups.values()];
}

/** `<agent folder>/skills/<name>/SKILL.md` at the top of the repository: the name; an agent folder is `agent` or starts with a dot. */
function agentSkillName(path: string): string | undefined {
  const [folder, skills, name, file, ...rest] = path.split('/');
  const agent = folder === 'agent' || folder.startsWith('.');
  return agent && skills === 'skills' && file === 'SKILL.md' && rest.length === 0 ? name : undefined;
}

/** The general copy first, the one in `.agents/skills`; then by path. */
function byGenerality(a: SkillFile, b: SkillFile): number {
  const general = (file: SkillFile) => (file.path.startsWith(`${GENERAL_ROOT}/`) ? 0 : 1);
  return general(a) - general(b) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
}

function readSkill(source: Source, file: SkillFile, text: string): { skill: Skill; warning?: string } {
  const parsed = parseSkill(text);
  const skill: Skill = {
    id: `${source.repository.id}:${file.path}`,
    repository: source.repository.id,
    path: file.path,
    name: parsed.name ?? file.name,
    description: parsed.description,
    commit: source.repository.commit,
    copies: file.copies,
    text,
  };
  return { skill, warning: parsed.warning && `${file.path}: ${parsed.warning}` };
}
