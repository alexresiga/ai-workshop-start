// The web view's filter: which skills to keep for what is typed. Plain JavaScript: the server
// sends this file to the browser as it is, and the tests import it.

/** The words of a filter, in lower case; none for an empty one. */
export function words(text) {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

/** A skill matches when every word is in its name or its description, in any case, anywhere. */
export function matches(skill, text) {
  const haystack = (skill.name + '\n' + (skill.description ?? '')).toLowerCase();
  return words(text).every((word) => haystack.includes(word));
}
