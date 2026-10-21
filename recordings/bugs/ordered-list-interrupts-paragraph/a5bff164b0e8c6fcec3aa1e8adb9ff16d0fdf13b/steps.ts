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

export const title = 'A line starting "2024." inside a paragraph becomes a numbered list item, and the year is lost';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: headings, paragraphs, lists, …", as on GitHub. ' +
  'In GitHub Markdown only a list starting at 1 can interrupt a paragraph, so "The format changed in\\n2024. Use the new one." is one paragraph; ' +
  '`markdown.js` ends the paragraph at "2024." and starts a list, so "2024." disappears.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: a paragraph whose second line starts "2024."',
    async run(page, act) {
      await withBody(page, 'The format changed in\n2024. Use the new one.\n');
      await expect(page.locator('#detail .markdown')).toContainText('Use the new one.');
      await act.pause();
    },
  },
  {
    caption: 'It should be one paragraph, "2024." in it, and no list',
    async run(page) {
      await expect(page.locator('#detail .markdown p').first()).toHaveText('The format changed in 2024. Use the new one.');
    },
  },
];
