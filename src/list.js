// The web view's list of skills: where each one lives, and what the filter matched. Plain JavaScript:
// the server sends this file to the browser as it is, and the tests import it.
import { words } from './filter.js';

/** The folder a skill lives in: the one that holds its `skills/` folder, else the first; none at the root. */
export function source(path) {
  const folders = path.split('/').slice(0, -1);
  const skills = folders.lastIndexOf('skills');
  if (skills > 0) return folders[skills - 1];
  return skills === 0 ? '' : (folders[0] ?? '');
}

/** The pieces of `text` that a word of the filter matches, in any case, as `[start, end)` in order, overlaps joined. */
export function marks(text, filter) {
  const lower = text.toLowerCase();
  const found = [];
  for (const word of words(filter)) {
    for (let at = lower.indexOf(word); at >= 0; at = lower.indexOf(word, at + 1)) found.push([at, at + word.length]);
  }
  found.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const joined = [];
  for (const [start, end] of found) {
    const last = joined.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else joined.push([start, end]);
  }
  return joined;
}
