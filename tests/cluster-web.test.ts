// spec/web.md: the skills in clusters under their headings, collapsed by default, in a real browser, with GitHub answering from tests/helpers.ts.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { github, searchAnswers } from './helpers.ts';

const skill = (name: string, description: string) => `---\nname: ${name}\ndescription: ${description}\n---\n# ${name}\n`;

/** example/build: gradle in three names, release in two, commits in none. */
const BUILD = {
  '.agents/skills/gradle-wrapper/SKILL.md': skill('gradle-wrapper', 'Update the Gradle wrapper.'),
  '.agents/skills/gradle-bump/SKILL.md': skill('gradle-bump', 'Bump the Gradle version.'),
  '.agents/skills/gradle-cache/SKILL.md': skill('gradle-cache', 'Clean the build cache.'),
  '.claude/skills/release-notes/SKILL.md': skill('release-notes', 'Write the release notes.'),
  '.claude/skills/release-checklist/SKILL.md': skill('release-checklist', 'Steps before a release.'),
  '.claude/skills/commits/SKILL.md': skill('commits', 'Write commit messages.'),
};

const server = createWebServer({
  // JetBrains/kotlin, the dice's repository, has the same skills.
  open: (url) =>
    openGitHub(url, { fetch: replay({ ...searchAnswers('example/build', BUILD), ...searchAnswers('JetBrains/kotlin', BUILD) }, github), token: 'test' }),
  organization: () => Promise.reject(new Error('not scanned')),
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

// Chromium, as CI installs it: `npx playwright install --with-deps chromium`; one that cannot start skips the browser tests.
const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

async function open(t: { after(fn: () => Promise<void>): void }, repo = 'example/build', random?: number): Promise<Page> {
  const page = await browser!.newPage();
  t.after(() => page.close());
  if (random !== undefined) await page.addInitScript((value) => (Math.random = () => value), random);
  await page.goto(`${base}/?repo=${repo}`);
  await expect(page.locator('#count')).toBeVisible();
  return page;
}

const headings = (page: Page) => page.locator('#skills .cluster:visible h2');
const shown = (page: Page) => page.locator('#skills button:visible .name');
const selected = (page: Page) => page.locator('#skills button[aria-current="true"] .name');
const toggle = (page: Page, heading: string) => page.locator('#skills .cluster h2 button', { hasText: heading });
const expanded = (page: Page) => page.locator('#skills .cluster h2 button').evaluateAll((buttons) => buttons.map((b) => b.getAttribute('aria-expanded')));

/** Opens each cluster, by its heading. */
async function unfold(page: Page, ...headings: string[]) {
  for (const heading of headings) await toggle(page, heading).click();
}

test('the page: the cluster module, served as it is', async () => {
  const page = await (await fetch(`${base}/`)).text();
  assert.match(page, /import \{ clusters \} from '\/cluster.js'/);
  const response = await fetch(`${base}/cluster.js`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/javascript/);
  assert.match(await response.text(), /export function clusters\(skills\)/);
});

browserTest('clusters: each under a heading, <word> · N, largest first, its skills by name; Other last', async (t) => {
  const page = await open(t);
  await expect(page.locator('#count')).toHaveText('6 skills');
  await expect(headings(page)).toHaveText(['gradle · 3', 'release · 2', 'Other · 1']);
  await unfold(page, 'gradle', 'release', 'Other');
  await expect(shown(page)).toHaveText(['gradle-bump', 'gradle-cache', 'gradle-wrapper', 'release-checklist', 'release-notes', 'commits']);
  await expect(page.getByRole('group', { name: 'release' }).locator('.name')).toHaveText(['release-checklist', 'release-notes']);
  await expect(page.getByRole('group', { name: 'Other' }).locator('.name')).toHaveText(['commits']);
});

browserTest('clusters: the first skill of the first cluster is selected', async (t) => {
  const page = await open(t);
  await expect(selected(page)).toHaveText('gradle-bump');
  await expect(page.locator('#detail .path')).toHaveText('.agents/skills/gradle-bump/SKILL.md');
});

browserTest('clusters: ↑ and ↓ move across them', async (t) => {
  const page = await open(t);
  await unfold(page, 'gradle', 'release', 'Other');
  await page.locator('#skills button', { hasText: 'gradle-wrapper' }).click();
  await page.keyboard.press('ArrowDown');
  await expect(selected(page)).toHaveText('release-checklist');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(selected(page)).toHaveText('commits');
  await page.keyboard.press('ArrowUp');
  await expect(selected(page)).toHaveText('release-notes');
  await expect(page.locator('#detail .path')).toHaveText('.claude/skills/release-notes/SKILL.md');
});

browserTest('clusters: the filter hides a cluster with no skill shown, and shows it again', async (t) => {
  const page = await open(t);
  await page.getByLabel('Filter skills').fill('write');
  await expect(headings(page)).toHaveText(['release · 2', 'Other · 1']);
  await expect(shown(page)).toHaveText(['release-notes', 'commits']);
  await expect(page.locator('#count')).toHaveText('2 of 6 skills');
  await expect(selected(page)).toHaveText('release-notes');
  await page.locator('#skills button', { hasText: 'release-notes' }).click();
  await page.keyboard.press('ArrowDown');
  await expect(selected(page)).toHaveText('commits');
  await page.keyboard.press('ArrowUp');
  await expect(selected(page)).toHaveText('release-notes');
  await page.getByLabel('Filter skills').fill('deploy');
  await expect(headings(page)).toHaveCount(0);
  await expect(page.locator('#unmatched')).toHaveText('No skill matches deploy.');
  await page.getByLabel('Filter skills').press('Escape');
  await expect(headings(page)).toHaveText(['gradle · 3', 'release · 2', 'Other · 1']);
});

browserTest('clusters: no word shared → the plain list, no heading', async (t) => {
  const page = await open(t, 'JetBrains/example');
  await expect(page.locator('#count')).toHaveText('1 skill');
  await expect(shown(page)).toHaveText(['commits']);
  await expect(page.locator('#skills .cluster')).toHaveCount(0);
  await expect(page.locator('#skills h2')).toHaveCount(0);
});

browserTest('collapsed by default: each heading a button, ▸, its skills hidden; the first skill still selected, on the right', async (t) => {
  const page = await open(t);
  await expect(headings(page)).toHaveText(['gradle · 3', 'release · 2', 'Other · 1']);
  await expect(page.locator('#skills .cluster h2').getByRole('button')).toHaveCount(3);
  assert.deepEqual(await expanded(page), ['false', 'false', 'false']);
  await expect(shown(page)).toHaveCount(0);
  await expect(selected(page)).toHaveText('gradle-bump');
  await expect(page.locator('#detail .path')).toHaveText('.agents/skills/gradle-bump/SKILL.md');
  const arrow = (heading: string) => toggle(page, heading).evaluate((button) => button.ownerDocument.defaultView!.getComputedStyle(button, '::before').content);
  assert.equal(await arrow('gradle'), '"▸ "');
  await toggle(page, 'gradle').click();
  assert.equal(await arrow('gradle'), '"▾ "');
});

browserTest('the heading shows its skills, and hides them again', async (t) => {
  const page = await open(t);
  await toggle(page, 'release').click();
  await expect(toggle(page, 'release')).toHaveAttribute('aria-expanded', 'true');
  await expect(shown(page)).toHaveText(['release-checklist', 'release-notes']);
  await page.locator('#skills button', { hasText: 'release-notes' }).click();
  await expect(page.locator('#detail .path')).toHaveText('.claude/skills/release-notes/SKILL.md');
  await toggle(page, 'release').click();
  await expect(toggle(page, 'release')).toHaveAttribute('aria-expanded', 'false');
  await expect(shown(page)).toHaveCount(0);
  await expect(selected(page)).toHaveText('release-notes');
});

browserTest('↑ and ↓ move only through the skills of open clusters', async (t) => {
  const page = await open(t);
  await unfold(page, 'gradle', 'Other');
  await page.locator('#skills button', { hasText: 'gradle-wrapper' }).click();
  await page.keyboard.press('ArrowDown');
  await expect(selected(page)).toHaveText('commits');
  await page.keyboard.press('ArrowDown');
  await expect(selected(page)).toHaveText('commits');
  await page.keyboard.press('ArrowUp');
  await expect(selected(page)).toHaveText('gradle-wrapper');
});

browserTest('text typed in the filter opens each cluster with a skill shown', async (t) => {
  const page = await open(t);
  await page.getByLabel('Filter skills').fill('write');
  await expect(headings(page)).toHaveText(['release · 2', 'Other · 1']);
  await expect(shown(page)).toHaveText(['release-notes', 'commits']);
  assert.deepEqual(await expanded(page), ['false', 'true', 'true']);
  await page.getByLabel('Filter skills').press('Escape');
  await expect(headings(page)).toHaveText(['gradle · 3', 'release · 2', 'Other · 1']);
  await expect(shown(page)).toHaveText(['release-checklist', 'release-notes', 'commits']);
  assert.deepEqual(await expanded(page), ['false', 'true', 'true']);
});

browserTest('the dice opens the cluster of the skill it picks', async (t) => {
  // Math.random at .5: of the 5 skills that are not gradle-bump, the third, release-checklist.
  const page = await open(t, 'example/build', 0.5);
  await page.locator('#dice').click();
  await expect(page.locator('#repository a')).toHaveText('JetBrains/kotlin');
  await expect(selected(page)).toHaveText('release-checklist');
  assert.deepEqual(await expanded(page), ['false', 'true', 'false']);
  await expect(shown(page)).toHaveText(['release-checklist', 'release-notes']);
});

browserTest('a new scan collapses them all again', async (t) => {
  const page = await open(t);
  await unfold(page, 'gradle', 'release', 'Other');
  assert.deepEqual(await expanded(page), ['true', 'true', 'true']);
  await page.getByLabel('Repository or organization link').fill('example/build');
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(page.locator('#count')).toHaveText('6 skills');
  await expect(shown(page)).toHaveCount(0);
  assert.deepEqual(await expanded(page), ['false', 'false', 'false']);
  await expect(selected(page)).toHaveText('gradle-bump');
});
