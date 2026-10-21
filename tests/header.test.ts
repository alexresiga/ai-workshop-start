// spec/web.md: the header fits the window at any width, in a real browser, with GitHub answering from tests/helpers.ts.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { scanOrganization } from '../src/core/organization.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { organizationAnswers, ORGANIZATION, searchAnswers, skill } from './helpers.ts';

/** JetBrains/intellij-community-plugins-and-skills: a long name, one skill. */
const LONG = 'JetBrains/intellij-community-plugins-and-skills';
const answers = replay(searchAnswers(LONG, { '.claude/skills/z/SKILL.md': skill('z') }));
const server = createWebServer({
  open: (url) => openGitHub(url, { fetch: answers, token: 'test' }),
  organization: (url, progress = () => {}) =>
    scanOrganization(url, { fetch: replay(organizationAnswers('JetBrains', 'Organization', ORGANIZATION)), token: 'test' }, progress),
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

// Chromium, as CI installs it: `npx playwright install --with-deps chromium`; one that cannot start skips the browser tests.
const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

async function open(t: { after(fn: () => Promise<void>): void }, address: string): Promise<Page> {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(base + address);
  return page;
}

/** Around the 50rem (800 px) breakpoint, where the issue was, and down to a phone. */
const WIDTHS = [1280, 1000, 900, 850, 820, 801, 800, 700, 500, 360, 320];

/** At each width: every element of the header wholly in the window, and no sideways scroll. */
async function expectFits(page: Page, selectors: string[]) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 720 });
    for (const selector of ['header h1', '#scan', '#dice', ...selectors]) {
      await expect(page.locator(selector), `${selector} at ${width} px`).toBeInViewport({ ratio: 1 });
    }
    assert.equal(await page.evaluate('document.documentElement.scrollWidth'), width, `no sideways scroll at ${width} px`);
  }
}

browserTest('an organization: the organization and both pills fit, just above 50rem too', async (t) => {
  const page = await open(t, '/?org=JetBrains');
  await expect(page.locator('#repositories')).toHaveText('3 of 5 repositories');
  await expectFits(page, ['#repository a', '#repository .pill:not(#repositories)', '#repositories']);
});

browserTest('a repository with a long name: the name and its pill fit', async (t) => {
  const page = await open(t, '/?repo=' + LONG);
  await expect(page.locator('#count')).toHaveText('1 skill');
  await expectFits(page, ['#repository a', '#count']);
});

browserTest('the page as it first opens: the header fits', async (t) => {
  const page = await open(t, '/');
  await expectFits(page, []);
});
