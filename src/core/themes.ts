// Clusters skills by theme with a small model. The core builds the question and checks the answer;
// who asks the model, `claude -p` on the server, comes in from the client.
import { AtlasError } from './errors.ts';
import { firstSentence, sortSkills, type Skill } from './model.ts';

/**
 * Asks the model; resolves to its answer, as text. The signal aborts when no one waits for it any more; `partial`, if
 * the model streams, hears its text so far.
 */
export type Ask = (prompt: string, signal?: AbortSignal, partial?: (text: string) => void) => Promise<string>;

/** Hears how many of the skills the model has put in a cluster so far, of how many. */
export type Clustered = (clustered: number, of: number) => void;

export type Cluster = { theme: string; skills: Skill[] };

export type ClusterResult = { clusters: Cluster[]; warnings: string[] };

/** Where the skills the model leaves out go. */
export const OTHER = 'Other';

/** How much of a description the model reads: its first sentence, cut at this many characters. */
export const DESCRIPTION_LENGTH = 160;

/** A line of the question: the skills that read the same, one number for all of them. */
type Entry = { line: string; skills: Skill[] };

/**
 * The skills by theme: every skill in exactly one cluster. A skill the model leaves out goes to
 * `Other`; one it names twice stays in the first cluster; a number not in the list is ignored. The
 * clusters with most skills first, then by theme; `Other` last. No skills → no question, no clusters.
 * `clustered` hears, as the answer streams, how many skills it has placed: only when that changes.
 */
export async function clusterSkills(skills: Skill[], ask: Ask, signal?: AbortSignal, clustered?: Clustered): Promise<ClusterResult> {
  if (skills.length === 0) return { clusters: [], warnings: [] };
  const list = entries(skills);
  let heard = 0;
  const partial = (text: string) => {
    const count = placedSoFar(text, list);
    if (count > heard) clustered?.((heard = count), skills.length);
  };
  const answer = parseAnswer(await ask(prompt(list), signal, clustered && partial));
  const placed = new Set<number>();
  const unknown: number[] = [];
  const twice: Entry[] = [];
  const themes = new Map<string, Skill[]>();
  for (const { theme, numbers } of answer) {
    for (const number of numbers) {
      const entry = Number.isInteger(number) ? list[number - 1] : undefined;
      if (!entry) unknown.push(number);
      else if (placed.has(number)) twice.push(entry);
      else {
        placed.add(number);
        // A theme named twice is one cluster.
        themes.set(theme, [...(themes.get(theme) ?? []), ...entry.skills]);
      }
    }
  }
  const missing = list.filter((_, index) => !placed.has(index + 1));
  if (missing.length > 0) themes.set(OTHER, [...(themes.get(OTHER) ?? []), ...missing.flatMap((entry) => entry.skills)]);
  const warnings: string[] = [];
  if (unknown.length) warnings.push(`the model named numbers not in the list: ${some(unknown.map(String))}; ignored`);
  if (twice.length) warnings.push(`the model named ${some(twice.map((entry) => entry.skills[0].name))} more than once; kept in the first cluster`);
  if (missing.length) warnings.push(`the model left out ${some(missing.map((entry) => entry.skills[0].name))}; in ${OTHER}`);
  const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  const clusters = [...themes].map(([theme, members]) => ({ theme, skills: sortSkills(members) }));
  clusters.sort(
    (a, b) =>
      Number(a.theme === OTHER) - Number(b.theme === OTHER) || b.skills.length - a.skills.length || compare(a.theme, b.theme),
  );
  return { clusters, warnings };
}

/** The question: each line numbered, the answer asked for as JSON. */
export function prompt(list: Entry[]): string {
  return [
    'Group these agent skills into clusters by theme: what each skill is for.',
    'Use a few clusters, each with a short theme of one to three words; every skill in exactly one cluster.',
    'Answer with JSON only, no other text:',
    '{"clusters": [{"theme": "<theme>", "skills": [<skill numbers>]}]}',
    '',
    'The skills:',
    ...list.map((entry, index) => `${index + 1}. ${entry.line}`),
  ].join('\n');
}

/**
 * Each skill's line, sorted by name: the name and the description's first sentence, cut at
 * DESCRIPTION_LENGTH. Skills with the same line, such as one copied into many repositories, share it.
 */
export function entries(skills: Skill[]): Entry[] {
  const lines = new Map<string, Skill[]>();
  for (const skill of sortSkills(skills)) {
    let description = firstSentence(skill.description);
    if (description.length > DESCRIPTION_LENGTH) description = `${description.slice(0, DESCRIPTION_LENGTH - 1)}…`;
    const line = description ? `${skill.name} — ${description}` : skill.name;
    lines.set(line, [...(lines.get(line) ?? []), skill]);
  }
  return [...lines].map(([line, skills]) => ({ line, skills }));
}

/**
 * How many skills the answer so far has placed: each number in a `"skills": [` list, once it is whole (a comma, a space
 * or the `]` after it), in the list and not named before, counts its line's skills.
 */
export function placedSoFar(text: string, list: Entry[]): number {
  const placed = new Set<number>();
  let count = 0;
  for (const [, numbers, closed] of text.matchAll(/"skills"\s*:\s*\[([^\]]*)(\]?)/g)) {
    // The last number not ended yet may still grow: 1 may be the start of 12.
    const whole = closed ? numbers : numbers.replace(/\d+$/, '');
    for (const [digits] of whole.matchAll(/\d+/g)) {
      const number = Number(digits);
      if (placed.has(number) || !list[number - 1]) continue;
      placed.add(number);
      count += list[number - 1].skills.length;
    }
  }
  return count;
}

/** The clusters in the model's answer: its JSON, even inside a ```json fence or after a sentence. */
function parseAnswer(text: string): { theme: string; numbers: number[] }[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  let data: unknown;
  try {
    data = start >= 0 ? JSON.parse(text.slice(start, end + 1)) : undefined;
  } catch {
    data = undefined;
  }
  const clusters = (data as { clusters?: unknown } | undefined)?.clusters;
  if (!Array.isArray(clusters)) throw new AtlasError(`The model's answer is not the clusters asked for: ${excerpt(text)}`);
  return clusters.map((cluster) => {
    const { theme, skills } = (cluster ?? {}) as { theme?: unknown; skills?: unknown };
    return {
      theme: typeof theme === 'string' && theme.trim() ? theme.trim() : OTHER,
      numbers: Array.isArray(skills) ? skills.map(Number) : [],
    };
  });
}

/** The first ten, each once, and how many more. */
function some(items: string[]): string {
  const unique = [...new Set(items)];
  return unique.length > 10 ? `${unique.slice(0, 10).join(', ')} and ${unique.length - 10} more` : unique.join(', ');
}

function excerpt(text: string): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > 200 ? `${line.slice(0, 200)}…` : line || '(empty)';
}
