// Strong inside emphasis in a SKILL.md (issue #74), against spec/web.md. The fixture has no such line, so code-style's
// body is swapped in the scan's answer, as the red agent found the bug.
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

export const title = 'Strong inside emphasis: *Always **run** the tests*';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "*Always **run** the tests*": the words in italics, "run" in bold too, no star left',
    covers: ['Emphasis may hold strong'],
    async run(page, act) {
      await withBody(page, '*Always **run** the tests*\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('Always run the tests');
      await expect(paragraph.locator('> em')).toHaveText('Always run the tests');
      await expect(paragraph.locator('> em > strong')).toHaveText('run');
      await act.pause();
    },
  },
  {
    caption: 'Now "*5 * 60 seconds*": the star with a space on each side is text, the whole line still in italics',
    covers: ['a star with a space on each side is text in it'],
    async run(page, act) {
      await withBody(page, '*5 * 60 seconds*\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('5 * 60 seconds');
      await expect(paragraph.locator('> em')).toHaveText('5 * 60 seconds');
      await act.pause();
    },
  },
];
