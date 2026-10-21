// Scanning a repository by its GitHub link (#38), against spec/web.md: the list says `Scanning <owner/repo>…`, not the link.
// The page opens on example/fixture; each scan's answer is held, so the spinner is on screen while it runs.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const input = (page: Page) => page.getByLabel('Repository or organization link');
const loading = (page: Page) => page.locator('#skills #loading');

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

export const title = 'Scanning a GitHub link says Scanning owner/repo…';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'Paste https://github.com/example/fixture: a spinner and Scanning example/fixture…; the button says Scanning…',
    covers: ['for a GitHub link too', 'the button says'],
    async run(page, act) {
      await holdScans(page);
      await input(page).fill('');
      await act.type(input(page), 'https://github.com/example/fixture');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(loading(page)).toHaveText('Scanning example/fixture…');
      await expect(loading(page).locator('.spinner')).toBeVisible();
      await expect(page.locator('#button')).toHaveText('Scanning…');
    },
  },
  {
    caption: 'Reduced motion, and the link with .git: Scanning example/fixture…, the spinner three times slower',
    covers: ['a slower spinner when the system asks for reduced motion'],
    async run(page, act) {
      await expect(page.locator('#count')).toHaveText('3 skills');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await input(page).fill('');
      await act.type(input(page), 'github.com/example/fixture.git');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(loading(page)).toHaveText('Scanning example/fixture…');
      expect(await duration(page)).toBe('2.4s');
      await expect(page.locator('#count')).toHaveText('3 skills');
      await page.unroute('**/api/scan?*');
    },
  },
];
