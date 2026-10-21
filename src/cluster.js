// The web view's clusters: a repository's skills grouped by the words their names share. Plain
// JavaScript: the server sends this file to the browser as it is, and the tests import it.

/** The words of a skill's name, in lower case, each once: split at `-`, `_`, `.` and spaces. */
export function nameWords(name) {
  return [...new Set(name.toLowerCase().split(/[-_.\s]+/).filter(Boolean))];
}

/**
 * The skills, in clusters: `[{ word, skills }]`, `word` null for Other. The word that the most
 * skills share makes the first cluster, with every skill that has it; then the same among the skills
 * left, until no word is shared by two of them; ties go to the word first in the alphabet. So the
 * clusters come largest first, then by word. The skills left are Other, last. Each cluster keeps the
 * skills' order. No word shared at all → no clusters: the plain list.
 */
export function clusters(skills) {
  const words = new Map(skills.map((skill) => [skill, nameWords(skill.name)]));
  let left = [...skills];
  const result = [];
  for (;;) {
    const counts = new Map();
    for (const skill of left) for (const word of words.get(skill)) counts.set(word, (counts.get(word) ?? 0) + 1);
    let best = null;
    for (const [word, count] of counts) {
      const top = best === null ? 0 : counts.get(best);
      if (count > top || (count === top && word < best)) best = word;
    }
    if (best === null || counts.get(best) < 2) break;
    result.push({ word: best, skills: left.filter((skill) => words.get(skill).includes(best)) });
    left = left.filter((skill) => !words.get(skill).includes(best));
  }
  if (!result.length) return [];
  if (left.length) result.push({ word: null, skills: left });
  return result;
}
