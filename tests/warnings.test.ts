// spec/web.md: the warnings under the header, hidden by default, in a real browser, with GitHub answering from tests/helpers.ts.
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { searchAnswers, skill } from './helpers.ts';

/** JetBrains/odd: two skills with malformed front matter, so two warnings; JetBrains/fine: none. */
const answers = replay({
  ...searchAnswers('JetBrains/odd', {
    '.claude/skills/x/SKILL.md': '---\nname: [x\n---\n',
    '.claude/skills/y/SKILL.md': '---\nname: [y\n---\n',
  }),
  ...searchAnswers('JetBrains/fine', { '.claude/skills/z/SKILL.md': skill('z') }),
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

async function open(t: { after(fn: () => Promise<void>): void }, address: string): Promise<Page> {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(base + address);
  await expect(page.locator('#count')).toBeVisible();
  return page;
}

const toggle = (page: Page) => page.locator('#warnings-toggle');

/** The warnings there, but hidden: only the button, `⚠ N warnings`, collapsed. */
async function expectHidden(page: Page, count: string) {
  await expect(toggle(page)).toBeVisible();
  await expect(toggle(page)).toHaveText('⚠ ' + count);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#warnings')).toBeHidden();
}

browserTest('a scan with warnings: hidden by default, only a ⚠ N warnings button under the header', async (t) => {
  const page = await open(t, '/?repo=JetBrains/odd');
  await expectHidden(page, '2 warnings');
  await expect(page.locator('#warnings li')).toHaveCount(2);
});

browserTest('the button shows the warnings, and hides them again', async (t) => {
  const page = await open(t, '/?repo=JetBrains/odd');
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#warnings li')).toHaveText([
    /^warning: \.claude\/skills\/x\/SKILL\.md: malformed front matter: /,
    /^warning: \.claude\/skills\/y\/SKILL\.md: malformed front matter: /,
  ]);
  await expect(page.locator('#warnings li').first()).toBeVisible();
  await toggle(page).click();
  await expectHidden(page, '2 warnings');
});

browserTest('no warnings: nothing under the header', async (t) => {
  const page = await open(t, '/?repo=JetBrains/fine');
  await expect(page.locator('#notices')).toBeHidden();
  await expect(page.locator('#warnings')).toBeEmpty();
});

browserTest('a new scan hides them again', async (t) => {
  const page = await open(t, '/?repo=JetBrains/odd');
  await toggle(page).click();
  await expect(page.locator('#warnings')).toBeVisible();
  await page.getByLabel('Repository or organization link').fill('JetBrains/fine');
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(page.locator('#repository a')).toHaveText('JetBrains/fine');
  await expect(page.locator('#notices')).toBeHidden();
  await page.getByLabel('Repository or organization link').fill('JetBrains/odd');
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(page.locator('#repository a')).toHaveText('JetBrains/odd');
  await expectHidden(page, '2 warnings');
});

browserTest('home hides them, and a scan after it starts with them hidden', async (t) => {
  const page = await open(t, '/?repo=JetBrains/odd');
  await toggle(page).click();
  await page.getByRole('link', { name: 'Skill Atlas' }).click();
  await expect(page.locator('#notices')).toBeHidden();
  await page.goBack();
  await expect(page.locator('#repository a')).toHaveText('JetBrains/odd');
  await expectHidden(page, '2 warnings');
});
