// The filter's highlights after an "İ" (#64), against spec/web.md. Expected values worked out by hand: code-style's
// description, edited in the scan's answer, is "İzmir team's review rules"; "İ" lowercases to two characters, "i̇".
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const filter = (page: Page) => page.getByLabel('Filter skills');
const marked = (page: Page) => page.locator('#skills button:visible .description mark');

export const title = 'Highlight the letters matched after an "İ"';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s description starts with "İ", a capital I with a dot: "İzmir team\'s review rules"',
    covers: ['what each of its words matches is **highlighted**'],
    async run(page, act) {
      await page.route('**/api/scan?*', async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        json.skills[0].description = "İzmir team's review rules";
        await route.fulfill({ response, json });
      });
      await page.reload();
      await expect(page.locator('#skills .description').first()).toHaveText("İzmir team's review rules");
      await act.pause();
    },
  },
  {
    caption: 'Type "review": the highlight is on "review", not one letter too far on',
    covers: ['on the letters matched, even after one that grows in lower case'],
    async run(page, act) {
      await act.type(filter(page), 'review');
      await expect(page.locator('#count')).toHaveText('1 of 3 skills');
      await expect(marked(page)).toHaveText(['review']);
    },
  },
  {
    caption: 'Add "i": it matches part of "İ", so all of "İ" is highlighted, and every other "i"',
    covers: ['a match of part of one such letter → all of it', 'every place it is'],
    async run(page, act) {
      await act.type(filter(page), ' i');
      await expect(marked(page)).toHaveText(['İ', 'i', 'review']);
      await expect(page.locator('#skills button:visible .description')).toHaveText("İzmir team's review rules");
    },
  },
];
