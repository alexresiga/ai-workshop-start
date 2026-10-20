// spec/web.md: **Skill Atlas** in the header returns home, in a real browser, with GitHub answering from tests/helpers.ts.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { scanOrganization } from '../src/core/organization.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { github, noWait, organizationAnswers, ORGANIZATION } from './helpers.ts';

const START = 'Paste a repository or an organization and press Scan.';

/** A scan of JetBrains/slow waits until `release` is called; `asked` resolves once the server has it. */
const { promise: gate, resolve: release } = Promise.withResolvers<void>();
const { promise: asked, resolve: ask } = Promise.withResolvers<void>();
const server = createWebServer({
  open: async (url) => {
    // The server hands on the GitHub link: https://github.com/JetBrains/slow.
    if (url.endsWith('/JetBrains/slow')) {
      ask();
      await gate;
    }
    return openGitHub(url.replace(/slow$/, 'example'), { fetch: github, token: 'test', wait: noWait });
  },
  organization: (url) => scanOrganization(url, { fetch: replay(organizationAnswers('JetBrains', 'Organization', ORGANIZATION)), token: 'test' }),
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

// Chromium, as CI installs it: `npx playwright install --with-deps chromium`; one that cannot start skips the browser tests.
const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

async function open(t: { after(fn: () => Promise<void>): void }, address = '/'): Promise<Page> {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(base + address);
  return page;
}

/** The page as it first opens: the input empty, no scan. */
async function expectHome(page: Page) {
  assert.equal(new URL(page.url()).search, '');
  await expect(page.getByLabel('Repository or organization link')).toHaveValue('');
  await expect(page.locator('#skills')).toHaveText(START);
  await expect(page.locator('#repository')).toBeEmpty();
  await expect(page.locator('#warnings')).toBeEmpty();
  await expect(page.locator('#detail')).toBeEmpty();
  await expect(page.getByLabel('Filter skills')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Scan' })).toBeEnabled();
  await expect(page.locator('#dice')).toBeEnabled();
}

test('the page: Skill Atlas in the header is a link home', async () => {
  const page = await (await fetch(`${base}/`)).text();
  const header = page.slice(page.indexOf('<header>'), page.indexOf('</header>'));
  assert.match(header, /<h1><a id="home" href="\/"[^>]*>Skill Atlas<\/a><\/h1>/);
});

browserTest('home: after a repository scan, the page as it first opens, the address with no ?repo=', async (t) => {
  const page = await open(t, '/?repo=JetBrains/example');
  await expect(page.locator('#count')).toHaveText('1 skill');
  await page.getByLabel('Filter skills').fill('commit');
  await page.getByRole('link', { name: 'Skill Atlas' }).click();
  await expectHome(page);
});

browserTest('home: after an organization scan, the address with no ?org=', async (t) => {
  const page = await open(t, '/?org=JetBrains');
  await expect(page.locator('#repositories')).toHaveText('3 of 5 repositories');
  await page.getByRole('link', { name: 'Skill Atlas' }).click();
  await expectHome(page);
  await expect(page.locator('#skills')).toHaveAttribute('aria-label', 'Skills');
});

browserTest('home: Back returns to the scan, Forward returns home', async (t) => {
  const page = await open(t, '/?repo=JetBrains/example');
  await expect(page.locator('#count')).toHaveText('1 skill');
  await page.getByRole('link', { name: 'Skill Atlas' }).click();
  await expectHome(page);
  await page.goBack();
  assert.equal(new URL(page.url()).searchParams.get('repo'), 'JetBrains/example');
  await expect(page.locator('#count')).toHaveText('1 skill');
  await expect(page.getByLabel('Repository or organization link')).toHaveValue('JetBrains/example');
  await page.goForward();
  await expectHome(page);
});

browserTest('home: a scan still running is dropped', async (t) => {
  const page = await open(t);
  await page.getByLabel('Repository or organization link').fill('JetBrains/slow');
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(page.locator('#skills')).toHaveText('Scanning JetBrains/slow…');
  await asked;
  await page.getByRole('link', { name: 'Skill Atlas' }).click();
  await expectHome(page);
  const answered = page.waitForResponse((response) => response.url().includes('/api/scan'));
  release();
  await answered;
  await page.waitForTimeout(250); // the page has read the answer, and ignored it
  await expectHome(page);
});

browserTest('home: on the home page already, it stays home and adds nothing to the history', async (t) => {
  const page = await open(t);
  const length = await page.evaluate<number>('history.length');
  await page.getByRole('link', { name: 'Skill Atlas' }).click();
  await expectHome(page);
  assert.equal(await page.evaluate<number>('history.length'), length);
});

browserTest('home: with Ctrl, ⌘, Shift or Alt, the click is the browser’s: home in a new tab or window, this one keeps its scan', async (t) => {
  for (const modifier of ['ControlOrMeta', 'Shift'] as const) {
    const page = await open(t, '/?repo=JetBrains/example');
    await expect(page.locator('#count')).toHaveText('1 skill');
    const opened = page.context().waitForEvent('page');
    await page.getByRole('link', { name: 'Skill Atlas' }).click({ modifiers: [modifier] });
    const other = await opened;
    t.after(() => other.close());
    await other.waitForLoadState();
    await expectHome(other);
    assert.equal(new URL(page.url()).searchParams.get('repo'), 'JetBrains/example', modifier);
    await expect(page.locator('#count')).toHaveText('1 skill');
  }
});

test('the page: the start message goes into the script as a JavaScript string', async () => {
  const page = await (await fetch(`${base}/`)).text();
  assert.match(page, /element\('p\.message', "Paste a repository or an organization and press Scan\."\)\);/);
});
