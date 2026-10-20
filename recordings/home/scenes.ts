// Skill Atlas in the header returns home (#17), against spec/web.md. The page opens on example/fixture, scanned:
// code-style, commits, release-checklist, so 3 skills; home is the page as it first opens, with no scan.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const START = 'Paste a repository or an organization and press Scan.';
const input = (page: Page) => page.getByLabel('Repository or organization link');
const home = (page: Page) => page.getByRole('link', { name: 'Skill Atlas' });
const address = (page: Page) => new URL(page.url()).search;

/** The page as it first opens: the input empty, no scan, nothing on the right. */
async function expectHome(page: Page) {
  await expect(input(page)).toHaveValue('');
  await expect(page.locator('#skills')).toHaveText(START);
  await expect(page.locator('#repository')).toBeEmpty();
  await expect(page.locator('#detail')).toBeEmpty();
  await expect(page.getByLabel('Filter skills')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Scan' })).toBeEnabled();
  await expect.poll(() => address(page)).toBe('');
}

export const title = 'Skill Atlas returns home';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'Click Skill Atlas: the page as it first opens, the input empty, no scan',
    covers: ['**Skill Atlas** in the header returns home'],
    async run(page, act) {
      await act.click(home(page));
      await expectHome(page);
    },
  },
  {
    caption: 'Back: the address has ?repo= again, and example/fixture is scanned, 3 skills',
    covers: ['so Back returns to the scan'],
    async run(page, act) {
      await page.goBack();
      await act.pause();
      await expect.poll(() => address(page)).toBe('?repo=example/fixture');
      await expect(input(page)).toHaveValue('example/fixture');
      await expect(page.locator('#count')).toHaveText('3 skills');
    },
  },
  {
    caption: 'Forward: home again',
    covers: ['Back or Forward to that address returns home too'],
    async run(page, act) {
      await page.goForward();
      await act.pause();
      await expectHome(page);
    },
  },
  {
    caption: 'Scan, and click Skill Atlas while it runs: the answer comes, and the page stays home',
    covers: ['a scan still running is dropped'],
    async run(page, act) {
      // The fixture answers at once: hold the answer so the scan is still running when Skill Atlas is clicked.
      await page.route('**/api/scan?*', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.continue();
      });
      await act.type(input(page), 'example/fixture');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(page.locator('#skills')).toHaveText('Scanning example/fixture…');
      const answered = page.waitForResponse((response) => response.url().includes('/api/scan'));
      await act.click(home(page));
      await answered;
      await page.unroute('**/api/scan?*');
      await act.pause();
      await expectHome(page);
    },
  },
];
