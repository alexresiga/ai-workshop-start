// spec/web.md: a spinner while a scan runs, and an organization's progress as a bar, in a real browser, with GitHub
// answering from tests/helpers.ts.
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { scanOrganization } from '../src/core/organization.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { github, noWait, organizationAnswers, ORGANIZATION } from './helpers.ts';

/** A held scan's gate: each `step()` lets one wait through, now or when it comes. */
function gates() {
  let permits = 0;
  const waiting: (() => void)[] = [];
  return {
    wait: () => (permits > 0 ? (permits--, Promise.resolve()) : new Promise<void>((resolve) => waiting.push(resolve))),
    step() {
      const next = waiting.shift();
      if (next) next();
      else permits++;
    },
  };
}

const repository = gates();
const organization = gates();
const server = createWebServer({
  // JetBrains/slow waits at its gate, then answers as JetBrains/example.
  open: async (url) => {
    if (url.endsWith('/JetBrains/slow')) await repository.wait();
    return openGitHub(url.replace(/slow$/, 'example'), { fetch: github, token: 'test', wait: noWait });
  },
  // Slow: listed after a step, 2 of 5 after another, then the rest and the answer after a third; Broken: fails once listed.
  organization: async (url, progress = () => {}) => {
    if (url.endsWith('/Broken')) {
      progress(0, 5);
      throw new Error('gone');
    }
    const fetch = replay(organizationAnswers('JetBrains', 'Organization', ORGANIZATION));
    if (!url.endsWith('/Slow')) return scanOrganization(url, { fetch, token: 'test' }, progress);
    await organization.wait();
    progress(0, 5);
    await organization.wait();
    progress(2, 5);
    await organization.wait();
    return scanOrganization(url.replace(/Slow$/, 'JetBrains'), { fetch, token: 'test' }, progress);
  },
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

// Chromium, as CI installs it: `npx playwright install --with-deps chromium`; one that cannot start skips the browser tests.
const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

async function open(t: { after(fn: () => Promise<void>): void }, address = '/', reducedMotion: 'reduce' | 'no-preference' = 'no-preference'): Promise<Page> {
  const context = await browser!.newContext({ reducedMotion });
  t.after(() => context.close());
  const page = await context.newPage();
  await page.goto(base + address);
  return page;
}

browserTest('a repository: a spinner and Scanning <owner/repo>… while it runs; the button says Scanning…', async (t) => {
  const page = await open(t, '/?repo=JetBrains/slow');
  const loading = page.locator('#skills #loading');
  await expect(loading).toHaveText('Scanning JetBrains/slow…');
  await expect(loading).toHaveAttribute('role', 'status');
  await expect(loading.locator('.spinner')).toBeVisible();
  assert.notEqual(await loading.locator('.spinner').evaluate((spinner) => spinner.ownerDocument.defaultView!.getComputedStyle(spinner).animationName), 'none');
  await expect(loading.locator('progress')).toHaveCount(0); // a repository: nothing to count
  await expect(page.locator('#button')).toHaveText('Scanning…');
  repository.step();
  await expect(page.locator('#skills .name')).toHaveText(['commits']);
  await expect(page.locator('#loading')).toHaveCount(0);
});

browserTest('an organization: Listing <org>’s repositories…, then Scanned N of M repositories and a bar, then the repositories', async (t) => {
  const page = await open(t, '/?org=Slow');
  const loading = page.locator('#skills #loading');
  await expect(loading).toHaveText('Listing Slow’s repositories…');
  await expect(loading.locator('.spinner')).toBeVisible();
  await expect(loading.locator('progress')).toHaveCount(0); // how many is not known yet
  organization.step();
  await expect(loading).toHaveText('Scanned 0 of 5 repositories');
  const bar = loading.getByRole('progressbar', { name: 'Repositories scanned' });
  await expect(bar).toHaveJSProperty('max', 5);
  await expect(bar).toHaveJSProperty('value', 0);
  // Marked, to see the next line updates them rather than building new ones: the spinner keeps turning, the bar eases.
  await loading.locator('.spinner, progress').evaluateAll((nodes) => nodes.forEach((node) => node.setAttribute('data-kept', '')));
  organization.step();
  await expect(loading).toHaveText('Scanned 2 of 5 repositories');
  await expect(bar).toHaveJSProperty('value', 2);
  await expect(loading.locator('.spinner')).toBeVisible();
  await expect(loading.locator('[data-kept]')).toHaveCount(2);
  organization.step();
  await expect(page.locator('#skills .name')).toHaveText(['JetBrains/idea', 'JetBrains/android', 'JetBrains/kotlin']);
  await expect(page.locator('#loading')).toHaveCount(0);
  await expect(page.locator('#button')).toHaveText('Scan');
});

browserTest('an organization: the page reads /api/organization/progress, then shows the repositories', async (t) => {
  const page = await open(t);
  // The lines themselves: tests/web.test.ts.
  const asked = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/organization/progress');
  await page.getByLabel('Repository or organization link').fill('JetBrains');
  await page.getByRole('button', { name: 'Scan' }).click();
  assert.equal(new URL((await asked).url()).searchParams.get('name'), 'JetBrains');
  await expect(page.locator('#skills .name')).toHaveText(['JetBrains/idea', 'JetBrains/android', 'JetBrains/kotlin']);
  await expect(page.locator('#loading')).toHaveCount(0);
});

browserTest('an organization that fails as it scans: its message, in the list, and no spinner', async (t) => {
  const page = await open(t, '/?org=Broken');
  await expect(page.locator('#skills .message.error')).toHaveText('Unexpected error: gone');
  await expect(page.locator('#loading')).toHaveCount(0);
  await expect(page.locator('#button')).toBeEnabled();
});

browserTest('a scan dropped for a later one: its progress is not shown', async (t) => {
  const page = await open(t, '/?org=Slow');
  await expect(page.locator('#loading')).toHaveText('Listing Slow’s repositories…');
  // Home drops the running scan; then a repository.
  await page.locator('#home').click();
  await page.getByLabel('Repository or organization link').fill('JetBrains/slow');
  await page.getByRole('button', { name: 'Scan' }).click();
  await expect(page.locator('#loading')).toHaveText('Scanning JetBrains/slow…');
  organization.step(); // Slow: 0 of 5, for a scan that is no longer the latest
  organization.step();
  organization.step();
  await page.waitForTimeout(200);
  await expect(page.locator('#loading')).toHaveText('Scanning JetBrains/slow…');
  repository.step();
  await expect(page.locator('#skills .name')).toHaveText(['commits']);
});

browserTest('reduced motion: the spinner turns slower', async (t) => {
  const duration = async (reducedMotion: 'reduce' | 'no-preference') => {
    const page = await open(t, '/?repo=JetBrains/slow', reducedMotion);
    const spinner = page.locator('#loading .spinner');
    await expect(spinner).toBeVisible();
    return spinner.evaluate((element) => element.ownerDocument.defaultView!.getComputedStyle(element).animationDuration);
  };
  assert.equal(await duration('no-preference'), '0.8s');
  assert.equal(await duration('reduce'), '2.4s');
  repository.step(); // both pages' scans are let through
  repository.step();
});
