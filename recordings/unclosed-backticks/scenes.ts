// A run of backticks with no closing run is text (#97), against spec/web.md, on example/fixture. Its SKILL.md bodies have no
// unclosed run of backticks, so the scene gives the first skill's SKILL.md another body, as the scan answers it.
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

export const title = 'A run of backticks with no closing run is text';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: '"Wrap code in ``` fences; use `x` inline.": the ``` as typed, only x is code',
    covers: ['a run of backticks with no closing run as long is text', 'only `x` code'],
    async run(page, act) {
      await withBody(page, 'Wrap code in ``` fences; use `x` inline.\n');
      await expect(markdown(page).locator('p')).toHaveText('Wrap code in ``` fences; use x inline.');
      await expect(markdown(page).locator('p code')).toHaveText(['x']);
      await act.pause(1500);
    },
  },
];
