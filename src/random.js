// The web view's dice: which skill to show at random. Plain JavaScript: the server sends this file
// to the browser as it is, and the tests import it.

/** The repository the dice picks from. */
export const DICE_REPOSITORY = 'JetBrains/kotlin';

/**
 * A random index of `count` skills, never `current` while there is another; -1 for none.
 * `random` is in [0, 1), as Math.random.
 */
export function pick(count, current = -1, random = Math.random) {
  if (count < 1) return -1;
  if (count === 1) return 0;
  const others = current >= 0 && current < count ? count - 1 : count;
  const index = Math.min(others - 1, Math.floor(random() * others));
  return others < count && index >= current ? index + 1 : index;
}
