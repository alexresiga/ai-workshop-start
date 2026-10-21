import { expect, type Page } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

/** The scan's answer, edited in the browser: code-style's SKILL.md with another body. */
async function withBody(page: Page, body: string) {
  await page.route('**/api/scan?*', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.skills[0].body = body;
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.locator('#detail .markdown').waitFor();
}

export const title = 'Text in single tildes (`Use ~old~ new names.`) is not struck out, as it is on GitHub';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … struck-out text", "as on GitHub". GitHub (GFM\'s strikethrough) ' +
  'strikes out text in one or two tildes: "old" struck out, no tilde left';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md says "Use ~old~ new names."',
    async run(page, act) {
      await withBody(page, 'Use ~old~ new names.\n');
      await expect(page.locator('#detail .markdown p')).toBeVisible();
      await act.pause();
    },
  },
  {
    caption: '"old" should be struck out, its tildes gone',
    async run(page, act) {
      await act.pause();
      await expect(page.locator('#detail .markdown p del')).toHaveText('old');
    },
  },
];
