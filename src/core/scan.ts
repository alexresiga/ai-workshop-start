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
  // Identical text is one skill, whichever agent's folder it is in.
  const copies = new Map<string, SkillFile[]>();
  for (const { file, bytes } of read) {
    if (!bytes) {
      warnings.push(`${file.path}: listed, but not found at the scanned commit; skipped`);
      continue;
    }
    const text = new TextDecoder().decode(bytes);
    copies.set(text, [...(copies.get(text) ?? []), file]);
  }
  const skills: Skill[] = [];
  for (const [text, same] of copies) {
    const [kept, ...others] = same.sort(byGenerality);
    const { skill, warning } = readSkill(source, { ...kept, copies: others.map((file) => file.path) }, text);
    skills.push(skill);
    if (warning) warnings.push(warning);
  }
  return { repository: source.repository, skills: sortSkills(skills), warnings };
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
  };
  return { skill, warning: parsed.warning && `${file.path}: ${parsed.warning}` };
}
