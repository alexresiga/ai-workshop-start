// Struck-out text in one tilde, as on GitHub (issue #100), against spec/web.md. The fixture has no tilde, so code-style's body
// is swapped in the scan's answer, as the red agent found the bug.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** The scan's answer, edited in the browser: code-style's SKILL.md with another body. */
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

export const title = 'Struck out in one tilde: Use ~old~ new names.';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "Use ~old~ new names.", then "Use ~~old~~ new names.": "old" struck out each time, no tilde left',
    covers: ['Text in one tilde or two is struck out'],
    async run(page, act) {
      await withBody(page, 'Use ~old~ new names.\n\nUse ~~old~~ new names.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Use old new names.', 'Use old new names.']);
      await expect(paragraphs.locator('del')).toHaveText(['old', 'old']);
      await expect(paragraphs.locator('del').first()).toHaveCSS('text-decoration-line', 'line-through');
      await act.pause();
    },
  },
  {
    caption: '"~a~~" and "~~a~": the closing tildes are not as many as the opening ones, so it is text',
    covers: ['the closing tildes are as many as the opening ones'],
    async run(page, act) {
      await withBody(page, 'Use ~a~~ here.\n\nUse ~~a~ here.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Use ~a~~ here.', 'Use ~~a~ here.']);
      await expect(page.locator('#detail .markdown del')).toHaveCount(0);
      await act.pause();
    },
  },
  {
    caption: '"~~~a~~~", "~ a~" and "\\~a~" are text: three tildes, a space inside, an escaped tilde',
    covers: ['three or more, `~~~a~~~`'],
    async run(page, act) {
      await withBody(page, 'Use ~~~a~~~ here.\n\nUse ~ a~ here.\n\nUse \\~a~ here.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Use ~~~a~~~ here.', 'Use ~ a~ here.', 'Use ~a~ here.']);
      await expect(page.locator('#detail .markdown del')).toHaveCount(0);
      await act.pause();
    },
  },
];
