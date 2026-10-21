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

export const title = 'A quote\'s second line without ">" falls out of the quote into a paragraph of its own';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … quotes …", as on GitHub. ' +
  'A line right after a quoted line, with no blank line between, continues the quote\'s paragraph (a lazy continuation): ' +
  '"> Never push to main\\non a Friday." is one quote, "Never push to main on a Friday."; `markdown.js` ends the quote at the first line.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: a quote whose second line has no ">"',
    async run(page, act) {
      await withBody(page, '> Never push to main\non a Friday.\n');
      await expect(page.locator('#detail .markdown blockquote')).toContainText('Never push to main');
      await act.pause();
    },
  },
  {
    caption: 'The quote should hold both lines: "Never push to main on a Friday."',
    async run(page) {
      await expect(page.locator('#detail .markdown blockquote')).toHaveText('Never push to main on a Friday.');
    },
  },
];
