// spec/demo.md: the demo's scenes cover each of its clauses, and its post is what the spec says.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { clauses, coverage } from '../.agents/skills/record-feature/scenes.ts';
import { notShown, scenes } from '../recordings/demo/scenes.ts';

const SPEC = readFileSync(new URL('../spec/demo.md', import.meta.url), 'utf8');
const POST = readFileSync(new URL('../recordings/demo/post.md', import.meta.url), 'utf8');

test('the demo: each clause of spec/demo.md shown in a scene, or why the screen cannot show it', () => {
  // Every line, as when the file is new: what the recorder takes against a commit without it.
  const every = new Set(SPEC.split('\n').map((_, index) => index + 1));
  assert.deepEqual(coverage(clauses('spec/demo.md', SPEC, every), scenes, notShown).problems, []);
});

test('the post: at most 600 characters, at least 12 emojis, and a link to this repository', () => {
  const characters = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(POST.trim())].map(({ segment }) => segment);
  assert.ok(characters.length <= 600, `${characters.length} characters`);
  const emojis = characters.filter((character) => /\p{Extended_Pictographic}/u.test(character));
  assert.ok(emojis.length >= 12, `${emojis.length} emojis`);
  assert.match(POST, /https:\/\/github\.com\/alexresiga\/ai-workshop-start(?![\w/-])/);
});
