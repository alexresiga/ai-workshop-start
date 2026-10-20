// spec/web.md: the filter above the skills; it keeps those whose name or description has every word typed.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matches, words } from '../src/filter.js';

const SKILLS = [
  { name: 'build-bump-gradle-version', description: 'Bumps the Gradle wrapper version.' },
  { name: 'commits', description: 'Write commit messages the way this repository does.' },
  { name: 'minimize-repro', description: 'Makes a minimal reproduction of a Frontend-related issue.' },
];
const kept = (text: string) => SKILLS.filter((skill) => matches(skill, text)).map((skill) => skill.name);

test('filter: a word in the name', () => {
  assert.deepEqual(kept('commits'), ['commits']);
});

test('filter: a word in the description', () => {
  assert.deepEqual(kept('wrapper'), ['build-bump-gradle-version']);
});

test('filter: in any case, anywhere in a word', () => {
  assert.deepEqual(kept('GRADLE'), ['build-bump-gradle-version']);
  assert.deepEqual(kept('repro'), ['minimize-repro']);
  assert.deepEqual(kept('mi'), ['commits', 'minimize-repro']);
});

test('filter: every word, each in the name or the description', () => {
  assert.deepEqual(kept('minimal frontend'), ['minimize-repro']);
  assert.deepEqual(kept('minimize Frontend'), ['minimize-repro']);
  assert.deepEqual(kept('gradle commit'), []);
});

test('filter: nothing typed, or only spaces, keeps every skill', () => {
  assert.deepEqual(kept(''), SKILLS.map((skill) => skill.name));
  assert.deepEqual(kept('   '), SKILLS.map((skill) => skill.name));
  assert.deepEqual(words('  Gradle\tversion  '), ['gradle', 'version']);
});

test('filter: no word matches → no skill', () => {
  assert.deepEqual(kept('kotlin'), []);
});

test('filter: a skill with no description, by its name', () => {
  assert.equal(matches({ name: 'pick', description: '' }, 'pick'), true);
  assert.equal(matches({ name: 'pick', description: '' }, 'fix'), false);
});
