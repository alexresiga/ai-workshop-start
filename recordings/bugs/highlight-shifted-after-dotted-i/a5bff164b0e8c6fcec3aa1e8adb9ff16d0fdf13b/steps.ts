import { expect, type Page } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

/** The scan's answer, edited in the browser: code-style's description starts with İ, a capital I with a dot (Turkish). */
async function withDescription(page: Page, description: string) {
  await page.route('**/api/scan?*', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.skills[0].description = description;
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.locator('#repository a').waitFor();
}

export const title = 'After an "İ" in a description, the filter highlights the wrong letters: "eview " for "review"';
export const expected =
  '`spec/web.md`, the filter: "what each of its words matches is highlighted in the names and descriptions shown, every place it is". ' +
  'Typing "review" should mark "review" in "İzmir team\'s review rules"; `marks()` in `list.js` finds it in `text.toLowerCase()`, ' +
  'where "İ" becomes two characters, and marks one character too far on.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s description: "İzmir team\'s review rules"',
    async run(page, act) {
      await withDescription(page, "İzmir team's review rules");
      await expect(page.locator('#skills .description').first()).toHaveText("İzmir team's review rules");
      await act.pause();
    },
  },
  {
    caption: 'Type "review" in the filter',
    async run(page, act) {
      await act.type(page.getByLabel('Filter skills'), 'review');
      await expect(page.locator('#count')).toHaveText('1 of 3 skills');
    },
  },
  {
    caption: 'The highlight should be on "review", not "eview "',
    async run(page) {
      await expect(page.locator('#skills .description mark')).toHaveText(['review']);
    },
  },
];
