// An escaped star never ends emphasis (#81), against spec/web.md, on example/fixture. Its SKILL.md bodies have no escaped
// delimiter, so each scene gives the first skill's SKILL.md another body, as the scan answers it.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** The scan's answer, edited in the browser: the first skill's SKILL.md with another body. */
async function withBody(page: Page, body: string) {
  await page.unroute('**/api/scan?*');
  await page.route('**/api/scan?*', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.skills[0].body = body;
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.locator('#repository a').waitFor();
}

const markdown = (page: Page) => page.locator('#detail .markdown');

export const title = 'An escaped star is a plain star';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: '"Use *\\*.kt* files": "*.kt" in italics, its star kept, no backslash, no stray star',
    covers: ['An escaped `\\*`, `\\_` or `\\~` is a plain character'],
    async run(page, act) {
      await withBody(page, 'Use *\\*.kt* files\n\nKeep ~~\\~old~~ and \\*not italic\\*\n');
      await expect(markdown(page).locator('p').first()).toHaveText('Use *.kt files');
      await expect(markdown(page).locator('p').first().locator('em')).toHaveText('*.kt');
      await expect(markdown(page).locator('p').first().locator('em')).toHaveCSS('font-style', 'italic');
      await expect(markdown(page).locator('p').nth(1)).toHaveText('Keep ~old and *not italic*');
      await expect(markdown(page).locator('p').nth(1).locator('del')).toHaveText('~old');
      await act.pause(1500);
    },
  },
  {
    caption: '"_a \\_ b_": "a _ b" in italics, the escaped underscore kept inside',
    covers: ['`_a \\_ b_` is "a _ b" in italics'],
    async run(page, act) {
      await withBody(page, 'Keep _a \\_ b_ together\n');
      await expect(markdown(page).locator('p')).toHaveText('Keep a _ b together');
      await expect(markdown(page).locator('p > em')).toHaveText('a _ b');
      await expect(markdown(page).locator('p > em')).toHaveCSS('font-style', 'italic');
      await act.pause(1500);
    },
  },
];
