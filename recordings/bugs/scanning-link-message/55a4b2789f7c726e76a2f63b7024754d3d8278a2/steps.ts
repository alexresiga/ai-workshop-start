import { expect } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

export const title = 'Scanning a GitHub link says "Scanning https://github.com/example/fixture…", not "Scanning example/fixture…"';
export const expected =
  '`spec/web.md`, the page: "While a scan runs, in the list: a **spinner** and `Scanning <owner/repo>…`"; for the link ' +
  '`https://github.com/example/fixture` the list says `Scanning example/fixture…`';
export const steps: Step[] = [
  {
    caption: 'Paste the GitHub link https://github.com/example/fixture',
    async run(page, act) {
      // GitHub slowed down, so the scan stays on screen long enough to read.
      await page.route('**/api/scan?*', async (route) => {
        await new Promise((done) => setTimeout(done, 4000));
        await route.continue();
      });
      await page.locator('#url').fill('');
      await act.type(page.locator('#url'), 'https://github.com/example/fixture');
      await expect(page.locator('#url')).toHaveValue('https://github.com/example/fixture');
    },
  },
  {
    caption: 'Press Scan: the list should say "Scanning example/fixture…"',
    async run(page, act) {
      await act.click(page.locator('#button'));
      await expect(page.locator('#skills .spinner')).toBeVisible();
      await expect(page.locator('#skills')).toContainText('Scanning example/fixture…', { timeout: 3000 });
    },
  },
];
