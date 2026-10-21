// spec/web.md: each skill in the list, with its source tag, its copies, `No description`, and what the filter matched,
// in a real browser with GitHub answering from tests/helpers.ts.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { marks, source } from '../src/list.js';
import { createWebServer } from '../src/web.ts';
import { searchAnswers, skill } from './helpers.ts';

const MPS = skill('mps-tests');
/** A repository with a skill in each kind of place: copies, a top `skills` folder, no `skills` folder, no description. */
const FILES = {
  '.agents/skills/mps-tests/SKILL.md': MPS,
  '.claude/skills/mps-tests/SKILL.md': MPS,
  '.github/skills/mps-tests/SKILL.md': MPS,
  'agent/skills/lint/SKILL.md': '---\nname: lint\ndescription: Lint the code, then lint the tests.\n---\n# Lint\n',
  'tools/kit/.claude/skills/deep/SKILL.md': skill('deep'),
  'skills/top/SKILL.md': skill('top'),
  'docs/guide/SKILL.md': '---\nname: guide\n---\n# Guide\n',
};
const server = createWebServer({
  open: (url) => openGitHub(url, { fetch: replay(searchAnswers('example/places', FILES)), token: 'test' }),
  organization: () => Promise.reject(new Error('no organization here')),
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

async function open(t: { after(fn: () => Promise<void>): void }): Promise<Page> {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(base + '/?repo=example/places');
  await expect(page.locator('#count')).toHaveText('5 skills');
  return page;
}

const row = (page: Page, name: string) => page.locator('#skills button', { has: page.locator('.name', { hasText: new RegExp(`^${name}$`) }) });

test('source: the folder that holds the skills folder, else the first, none at the root or in a top skills folder', () => {
  assert.equal(source('.claude/skills/commits/SKILL.md'), '.claude');
  assert.equal(source('.agents/skills/commits/SKILL.md'), '.agents');
  assert.equal(source('agent/skills/writing-lint-checks/SKILL.md'), 'agent');
  assert.equal(source('plugins/kit/.claude/skills/x/SKILL.md'), '.claude');
  assert.equal(source('docs/guide/SKILL.md'), 'docs');
  assert.equal(source('skills/top/SKILL.md'), '');
  assert.equal(source('SKILL.md'), '');
});

test('marks: every place each word matches, in any case, overlaps joined; none for an empty filter', () => {
  assert.deepEqual(marks('Lint the code, then lint the tests.', 'LINT'), [[0, 4], [20, 24]]);
  assert.deepEqual(marks('commits', 'comm its'), [[0, 7]]);
  assert.deepEqual(marks('commits', 'mmi omm'), [[1, 5]]);
  assert.deepEqual(marks('code-style', 'style co'), [[0, 2], [5, 10]]);
  assert.deepEqual(marks('anything', '   '), []);
  assert.deepEqual(marks('aaa', 'aa'), [[0, 3]]);
});

browserTest('list: beside each name, the folder it lives in as a tag, its path when hovered; none in a top skills folder', async (t) => {
  const page = await open(t);
  const tags = page.locator('#skills button').evaluateAll((items) =>
    items.map((item) => [item.querySelector('.name')!.textContent, item.querySelector('.source')?.textContent ?? '']),
  );
  assert.deepEqual(await tags, [
    ['deep', '.claude'],
    ['guide', 'docs'],
    ['lint', 'agent'],
    ['mps-tests', '.agents'],
    ['top', ''],
  ]);
  await expect(row(page, 'deep').locator('.source')).toHaveAttribute('title', 'tools/kit/.claude/skills/deep/SKILL.md');
});

browserTest('list: a skill with copies has a +N copies pill, their paths when hovered; one with none has no pill', async (t) => {
  const page = await open(t);
  const more = row(page, 'mps-tests').locator('.more');
  await expect(more).toHaveText('+2 copies');
  await expect(more).toHaveAttribute('title', 'also in .claude/skills/mps-tests/SKILL.md, .github/skills/mps-tests/SKILL.md');
  await expect(page.locator('#skills .more')).toHaveCount(1);
});

browserTest('list: a skill with no description → No description, in muted italics', async (t) => {
  const page = await open(t);
  const description = row(page, 'guide').locator('.description');
  await expect(description).toHaveText('No description');
  await expect(description).toHaveCSS('font-style', 'italic');
  await expect(row(page, 'lint').locator('.description')).toHaveText('Lint the code, then lint the tests.');
  await expect(row(page, 'lint').locator('.description')).toHaveCSS('font-style', 'normal');
  // Each row has two lines, with a description or without.
  const heights = await page.locator('#skills button').evaluateAll((items) => items.map((item) => item.getBoundingClientRect().height));
  assert.equal(new Set(heights).size, 1, String(heights));
});

browserTest('list: while the filter has text, what each word matches is highlighted, every place it is; cleared, none', async (t) => {
  const page = await open(t);
  const filter = page.getByLabel('Filter skills');
  await filter.fill('LINT');
  await expect(row(page, 'lint').locator('.name mark')).toHaveText(['lint']);
  await expect(row(page, 'lint').locator('.description mark')).toHaveText(['Lint', 'lint']);
  await expect(row(page, 'lint').locator('.description')).toHaveText('Lint the code, then lint the tests.');
  await filter.fill('run mps');
  await expect(row(page, 'mps-tests').locator('mark')).toHaveText(['mps', 'Run', 'mps']);
  await expect(page.locator('#skills button:visible')).toHaveCount(1);
  // The text no description stands for is not matched: `No description` is not the skill's.
  await filter.fill('description');
  await expect(page.locator('#unmatched')).toHaveText('No skill matches description.');
  await filter.press('Escape');
  await expect(page.locator('#skills mark')).toHaveCount(0);
  await expect(page.locator('#skills button:visible')).toHaveCount(5);
});
