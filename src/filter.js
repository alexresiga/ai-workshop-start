// The web view's filter over the skills. Plain JavaScript: the server sends this file to the browser
// as it is, and the tests import it.

/**
 * The skills, in their order, with every word of the filter in the name or the description, in
 * any case; a part of a word counts. An empty filter keeps them all.
 */
export function filter(skills, text) {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  return skills.filter((skill) => {
    const name = skill.name.toLowerCase();
    const description = skill.description.toLowerCase();
    return words.every((word) => name.includes(word) || description.includes(word));
  });
}
