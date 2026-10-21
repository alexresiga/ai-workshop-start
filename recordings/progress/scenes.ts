// A spinner while a scan runs, and an organization's progress (#29), against spec/web.md. The page opens on example/fixture.
// The recorder answers no organization, so `example` is answered here: its /api/organization/progress, streamed line by
// line from a small server of the scene's own, at a reading pace. By hand: 3 repositories, listed after a moment, then
// 0, 1, 2 and 3 of them scanned; only example/fixture has skills, its 3.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const input = (page: Page) => page.getByLabel('Repository or organization link');
const loading = (page: Page) => page.locator('#skills #loading');

const ANSWER = {
  organization: { id: 'example', url: 'https://github.com/example' },
  repositories: [{ id: 'example/fixture', url: 'https://github.com/example/fixture', skills: 3 }],
  scanned: 3,
  warnings: [],
};
/** Each line, after how long. */
const LINES: [number, unknown][] = [
  [1800, { progress: { scanned: 0, of: 3 } }],
  [1200, { progress: { scanned: 1, of: 3 } }],
  [1200, { progress: { scanned: 2, of: 3 } }],
  [2400, { progress: { scanned: 3, of: 3 } }],
  [300, ANSWER],
];

/** The streamed answer for `example`, line by line. */
let streaming: Server | undefined;
async function stream(): Promise<string> {
  streaming ??= createServer(async (_, response) => {
    response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    for (const [after, line] of LINES) {
      await new Promise((resolve) => setTimeout(resolve, after));
      response.write(JSON.stringify(line) + '\n');
    }
    response.end();
  }).unref();
  if (!streaming.listening) await new Promise<void>((resolve) => streaming!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(streaming.address() as AddressInfo).port}/`;
}

/** Holds each repository scan's answer, so the spinner is on screen while it runs. */
async function holdScans(page: Page) {
  await page.unroute('**/api/scan?*');
  await page.route('**/api/scan?*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await route.continue();
  });
}

const duration = (page: Page) =>
  page.locator('#loading .spinner').evaluate((spinner) => spinner.ownerDocument.defaultView!.getComputedStyle(spinner).animationDuration);

export const title = 'A spinner while a scan runs, and an organization’s progress';
export const notShown = {
  '`GET /api/organization/progress?name=': 'the server’s API has nothing on screen; tests/web.test.ts checks it',
  'the last line, the answer of `/api/organization`': 'the server’s API has nothing on screen; tests/web.test.ts checks it',
  'not an organization → status 400': 'the server’s API has nothing on screen; tests/web.test.ts checks it',
  'what the page reads': 'the server’s API has nothing on screen; tests/progress.test.ts checks the page reads it',
};
export const scenes: Scene[] = [
  {
    caption: 'Scan example/fixture: a spinner and Scanning example/fixture… while it runs; the button says Scanning…',
    covers: ['While a scan runs, in the list: a **spinner**', 'the button says'],
    async run(page, act) {
      await holdScans(page);
      await input(page).fill('');
      await act.type(input(page), 'example/fixture');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(loading(page)).toHaveText('Scanning example/fixture…');
      await expect(loading(page).locator('.spinner')).toBeVisible();
      await expect(page.locator('#button')).toHaveText('Scanning…');
    },
  },
  {
    caption: 'Reduced motion: the spinner turns three times slower',
    covers: ['a slower spinner when the system asks for reduced motion'],
    async run(page, act) {
      await expect(page.locator('#count')).toHaveText('3 skills');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(loading(page)).toHaveText('Scanning example/fixture…');
      expect(await duration(page)).toBe('2.4s');
    },
  },
  {
    caption: 'Scan the organization example: the spinner and Listing example’s repositories…, until they are listed',
    covers: ['While it scans, in the list: the spinner and `Listing <org>’s repositories…`'],
    async run(page, act) {
      await expect(page.locator('#count')).toHaveText('3 skills');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.unroute('**/api/scan?*');
      const url = await stream();
      await page.route('**/api/organization/progress?*', (route) => route.continue({ url }));
      await input(page).fill('');
      await act.type(input(page), 'example');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(loading(page)).toHaveText('Listing example’s repositories…');
      await expect(loading(page).locator('progress')).toHaveCount(0);
    },
  },
  {
    caption: 'Then Scanned N of 3 repositories and a bar, moving on as each is done; then the repositories',
    covers: ['then `Scanned N of M repositories` and a **progress bar**', 'the same spinner and bar each step'],
    async run(page) {
      const bar = loading(page).getByRole('progressbar', { name: 'Repositories scanned' });
      await expect(loading(page)).toHaveText('Scanned 1 of 3 repositories');
      await expect(bar).toHaveJSProperty('value', 1);
      // Marked, to see the next step updates the spinner and the bar rather than building new ones.
      await loading(page).locator('.spinner, progress').evaluateAll((nodes) => nodes.forEach((node) => node.setAttribute('data-kept', '')));
      await expect(loading(page)).toHaveText('Scanned 2 of 3 repositories');
      await expect(bar).toHaveJSProperty('value', 2);
      await expect(bar).toHaveJSProperty('max', 3);
      await expect(loading(page).locator('[data-kept]')).toHaveCount(2);
      await expect(page.locator('#repositories')).toHaveText('1 of 3 repositories');
      await expect(page.locator('#skills .name')).toHaveText(['example/fixture']);
      await page.unroute('**/api/organization/progress?*');
    },
  },
];
