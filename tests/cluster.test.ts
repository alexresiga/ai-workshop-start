// spec/web.md: the skills in clusters, by the words their names share; the rest in Other.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clusters, nameWords } from '../src/cluster.js';

/** Each cluster as `<word>: <names>`, Other as `Other: <names>`. */
const grouped = (...names: string[]) =>
  clusters(names.map((name) => ({ name, description: '' }))).map(
    (cluster) => `${cluster.word ?? 'Other'}: ${cluster.skills.map((skill) => skill.name).join(' ')}`,
  );

test('clusters: the words of a name, split at -, _, . and spaces, in lower case, each once', () => {
  assert.deepEqual(nameWords('build-tools_bump.Gradle api'), ['build', 'tools', 'bump', 'gradle', 'api']);
  assert.deepEqual(nameWords('gradle--gradle'), ['gradle']);
  assert.deepEqual(nameWords('commits'), ['commits']);
});

test('clusters: the word the most skills share makes the first cluster, with every skill that has it', () => {
  assert.deepEqual(grouped('build-docs', 'build-tools', 'commits', 'gradle-build', 'release-notes', 'release-tag'), [
    'build: build-docs build-tools gradle-build',
    'release: release-notes release-tag',
    'Other: commits',
  ]);
});

test('clusters: then among the skills left, while a word is shared by two of them', () => {
  // gradle is shared by two skills, but gradle-build is already in build: gradle-bump is left alone.
  assert.deepEqual(grouped('build-docs', 'build-tools', 'gradle-build', 'gradle-bump'), [
    'build: build-docs build-tools gradle-build',
    'Other: gradle-bump',
  ]);
});

test('clusters: a tie → the word first in the alphabet', () => {
  assert.deepEqual(grouped('kotlin-test', 'kotlin-zip', 'java-test', 'java-zip'), ['java: java-test java-zip', 'kotlin: kotlin-test kotlin-zip']);
  assert.deepEqual(grouped('b-x', 'b-y', 'a-x'), ['b: b-x b-y', 'Other: a-x']);
});

test('clusters: in any case', () => {
  assert.deepEqual(grouped('Gradle-bump', 'gradle-cache'), ['gradle: Gradle-bump gradle-cache']);
});

test('clusters: largest first, each with its skills in the order they came, by name', () => {
  assert.deepEqual(grouped('a-x', 'b-y', 'c-y', 'd-x', 'e-y'), ['y: b-y c-y e-y', 'x: a-x d-x']);
});

test('clusters: the skills left → Other, last; none left → no Other', () => {
  assert.deepEqual(grouped('commits', 'gradle-a', 'gradle-b'), ['gradle: gradle-a gradle-b', 'Other: commits']);
  assert.deepEqual(grouped('gradle-a', 'gradle-b'), ['gradle: gradle-a gradle-b']);
});

test('clusters: no word shared → none, the plain list', () => {
  assert.deepEqual(grouped('code-style', 'commits', 'release-checklist'), []);
  assert.deepEqual(grouped('commits'), []);
  assert.deepEqual(grouped(), []);
});
