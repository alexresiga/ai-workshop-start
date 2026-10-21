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
  await page.locator('#repository a').waitFor();
}

export const title = 'A line ending in "\\" shows the backslash, not a line break: "Tag the release.\\ Push the tag."';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … paragraphs", as on GitHub, where a backslash at the end of ' +
  'a line is a hard line break (CommonMark, "Hard line breaks"): "Tag the release.\\" then "Push the tag." are two lines of ' +
  'one paragraph, no backslash; `markdown.js` joins them with a space and keeps the `\\`.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "Tag the release.\\", then "Push the tag." on the next line',
    async run(page, act) {
      await withBody(page, 'Tag the release.\\\nPush the tag.\n');
      await expect(page.locator('#detail .markdown p')).toContainText('Tag the release.');
      await act.pause();
    },
  },
  {
    caption: 'It should be two lines, with no backslash',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).not.toContainText('\\');
      await expect(page.locator('#detail .markdown p br')).toHaveCount(1);
    },
  },
];
