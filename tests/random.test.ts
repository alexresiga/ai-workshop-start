// spec/web.md: the dice in the header; a random skill from JetBrains/kotlin, never the selected one while there is another.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DICE_REPOSITORY, pick } from '../src/random.js';

/** Every index `pick` gives for random numbers across [0, 1). */
const picks = (count: number, current?: number) => {
  const seen = new Set<number>();
  for (let i = 0; i < 100; i++) seen.add(pick(count, current, () => i / 100));
  seen.add(pick(count, current, () => 0.9999999999));
  return [...seen].sort((a, b) => a - b);
};

test('dice: from JetBrains/kotlin', () => {
  assert.equal(DICE_REPOSITORY, 'JetBrains/kotlin');
});

test('dice: any of the skills, when none is selected', () => {
  assert.deepEqual(picks(4), [0, 1, 2, 3]);
  assert.deepEqual(picks(4, -1), [0, 1, 2, 3]);
});

test('dice: never the selected skill while there is another', () => {
  assert.deepEqual(picks(4, 0), [1, 2, 3]);
  assert.deepEqual(picks(4, 2), [0, 1, 3]);
  assert.deepEqual(picks(4, 3), [0, 1, 2]);
  assert.deepEqual(picks(2, 1), [0]);
});

test('dice: the only skill, even when it is selected', () => {
  assert.deepEqual(picks(1, 0), [0]);
  assert.deepEqual(picks(1), [0]);
});

test('dice: no skill → none', () => {
  assert.equal(pick(0), -1);
  assert.equal(pick(0, 0), -1);
});

test('dice: Math.random by default, always a skill of the list', () => {
  for (let i = 0; i < 200; i++) {
    const index = pick(6, 2);
    assert.ok(Number.isInteger(index) && index >= 0 && index < 6 && index !== 2, String(index));
  }
});
