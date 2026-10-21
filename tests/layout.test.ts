// spec/web.md: the page fits the window, a phone's 375 px too, with no sideways scroll; in a real browser, with GitHub
// answering from tests/helpers.ts: the fixture, as the red agent found the bug on it, and a skill with long lines.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect, type Locator, type Page } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { FIXTURE, searchAnswers } from './helpers.ts';

const fixture = (path: string) => readFileSync(join(FIXTURE, path), 'utf8');

/** One unbroken word, a line of code, a table, a link: each wider than a phone. */
const LONG = [
  '---',
  'name: a-skill-with-a-name-far-too-long-to-fit-on-a-phone-screen-at-all',
  `description: ${'A description that goes on and on, far wider than any phone. '.repeat(4)}`,
  'allowed-tools: Bash(git log --oneline --graph --decorate --all --since=two-weeks-ago:*)',
  '---',
  '# A skill with long lines',
  '',
  'https://github.com/JetBrains/example/blob/main/a/very/long/path/that/never/breaks/anywhere/at/all/SKILL.md',
  '',
  '```',
  `git log --format='%H %an %ae %ad %s' --date=iso --since=two-weeks-ago --author=someone@example.com -- src/`,
  '```',
  '',
  // Sixteen columns: even with each cell wrapped, wider than a phone.
  `| ${Array.from({ length: 16 }, (_, i) => `Column ${i + 1}`).join(' | ')} |`,
  `|${' --- |'.repeat(16)}`,
  `| ${Array.from({ length: 16 }, (_, i) => `value-${i + 1}`).join(' | ')} |`,
  '',
].join('\n');

/** A skill deep in a repository, its folders with no hyphen to break at: its path, in a warning, wider than a phone. */
const DEEP = 'plugins/kotlinGradlePluginIntegrationTests/src/integrationTestSources/.claude/skills/releaseChecklist/SKILL.md';

/** An ordinary table, five columns of whole words: too wide for a phone unless its words break. */
const ORDINARY = [
  '---',
  'name: options',
  'description: The options.',
  '---',
  '| Option | Environment | Type | Default | Description |',
  '| --- | --- | --- | --- | --- |',
  '| concurrency | ATLAS_CONCURRENCY | number | eight | parallelism |',
  '',
].join('\n');

const answers = replay({
  ...searchAnswers('example/fixture', {
    '.github/skills/code-style/SKILL.md': fixture('.github/skills/code-style/SKILL.md'),
    '.claude/skills/commits/SKILL.md': fixture('.claude/skills/commits/SKILL.md'),
    '.agents/skills/release-checklist/SKILL.md': fixture('.agents/skills/release-checklist/SKILL.md'),
  }),
  ...searchAnswers('example/long', { '.claude/skills/a-skill-with-a-name-far-too-long/SKILL.md': LONG }),
  ...searchAnswers('example/deep', { [DEEP]: fixture('.agents/skills/release-checklist/SKILL.md') }),
  ...searchAnswers('example/table', { '.claude/skills/options/SKILL.md': ORDINARY }),
});
const server = createWebServer({
  open: (url) => openGitHub(url, { fetch: answers, token: 'test' }),
  organization: () => Promise.reject(new Error('not scanned')),
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

// Chromium, as CI installs it: `npx playwright install --with-deps chromium`; one that cannot start skips the browser tests.
const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

async function open(t: { after(fn: () => Promise<void>): void }, address: string, width: number): Promise<Page> {
  const page = await browser!.newPage({ viewport: { width, height: 720 } });
  t.after(() => page.close());
  await page.goto(base + address);
  await expect(page.locator('#count')).toBeVisible();
  await expect(page.locator('#detail .markdown')).toBeVisible();
  return page;
}

/** No sideways scroll: the page is as wide as the window. */
async function expectNoSidewaysScroll(page: Page, width: number) {
  expect(await page.locator('html').evaluate((html) => html.scrollWidth)).toBe(width);
  expect(await page.locator('body').evaluate((body) => body.scrollWidth)).toBe(width);
}

/** Each of them begins and ends inside the window, side to side. */
async function expectInside(locator: Locator, width: number) {
  for (const box of await locator.evaluateAll((all) => all.map((element) => element.getBoundingClientRect().toJSON()))) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(width);
  }
}

browserTest('375 px, the fixture: the header, the filter and each skill fit the window, no sideways scroll', async (t) => {
  const page = await open(t, '/?repo=example/fixture', 375);
  await expect(page.locator('#scan')).toBeInViewport({ ratio: 1 });
  await expect(page.getByLabel('Filter skills')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('nav button')).toHaveCount(3);
  await expectInside(page.locator('nav button'), 375);
  await expectInside(page.locator('#detail'), 375);
  await expectNoSidewaysScroll(page, 375);
});

browserTest('375 px, long lines: the skill is cut with …, the SKILL.md fits, its code and table scroll on their own', async (t) => {
  const page = await open(t, '/?repo=example/long', 375);
  await expect(page.getByLabel('Filter skills')).toBeInViewport({ ratio: 1 });
  await expectInside(page.locator('nav button, nav .name, nav .description'), 375);
  await expectInside(page.locator('#detail, .file, .front-matter, .tags span, .markdown > *'), 375);
  for (const wide of [page.locator('.markdown pre'), page.locator('.markdown .table')]) {
    expect(await wide.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await expectNoSidewaysScroll(page, 375);
});

browserTest('375 px, a warning naming a long path: it wraps inside the window, no sideways scroll', async (t) => {
  const page = await open(t, '/?repo=example/deep', 375);
  await expect(page.locator('#warnings-toggle')).toHaveText('⚠ 1 warning');
  await page.locator('#warnings-toggle').click();
  await expect(page.locator('#warnings li')).toContainText(DEEP);
  await expectInside(page.locator('#notices, #warnings li'), 375);
  await expectNoSidewaysScroll(page, 375);
});

browserTest('a wide window, long lines: the list beside the SKILL.md, no sideways scroll', async (t) => {
  const page = await open(t, '/?repo=example/long', 1280);
  const list = await page.locator('aside').boundingBox();
  const detail = await page.locator('#detail').boundingBox();
  expect(list!.x + list!.width).toBeLessThanOrEqual(detail!.x);
  await expectInside(page.locator('aside, #detail, .markdown > *'), 1280);
  await expectNoSidewaysScroll(page, 1280);
});

browserTest('375 px, an ordinary table: each word in its cells stays whole, on one line, and the table scrolls in its box', async (t) => {
  const page = await open(t, '/?repo=example/table', 375);
  const cells = page.locator('.markdown th, .markdown td');
  await expect(cells).toHaveCount(10);
  const lines = await cells.evaluateAll((all) =>
    all.map((cell) => {
      const range = cell.ownerDocument.createRange();
      range.selectNodeContents(cell);
      return [cell.textContent, range.getClientRects().length];
    }),
  );
  for (const [text, count] of lines) expect([text, count]).toEqual([text, 1]);
  const box = page.locator('.markdown .table');
  expect(await box.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await expectInside(box, 375);
  await expectNoSidewaysScroll(page, 375);
});
