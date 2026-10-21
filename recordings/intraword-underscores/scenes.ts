// Underscores inside a word in the web view (issue #65), against spec/web.md. code-style's SKILL.md is given another body
// in the browser, as the red agent's repro did; the expected text is the body as written, worked out by hand.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** The scan's answer, edited in the browser: code-style's SKILL.md with another body. */
async function withBody(page: Page, body: string) {
  await page.route('**/api/scan?*', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.skills[0].body = body;
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.locator('#repository a').waitFor();
}

export const title = 'Underscores inside a word are not emphasis';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md: "Call my__init__ first, keep snake_case_names." reads as it is, nothing bold',
    covers: ['underscores inside a word'],
    async run(page, act) {
      await withBody(page, 'Call my__init__ first, keep snake_case_names.\n\n__Always__ run the tests.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs.first()).toHaveText('Call my__init__ first, keep snake_case_names.');
      await expect(paragraphs.first().locator('strong, em')).toHaveCount(0);
      await expect(paragraphs.nth(1).locator('strong')).toHaveText('Always');
      await act.pause();
    },
  },
];
