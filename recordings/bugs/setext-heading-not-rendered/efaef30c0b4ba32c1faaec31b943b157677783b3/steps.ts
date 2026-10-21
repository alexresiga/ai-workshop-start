import { expect, type Page } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

/** The scan's answer, edited in the browser: code-style's SKILL.md with a setext heading, `Code style` over `==========`. */
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

export const title = 'A setext heading (`Code style` over `=====`) shows as a paragraph, "Code style ====="';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: headings, …". A line underlined with `=` is a level-1 heading ' +
  '(and with `-`, level 2), as on GitHub; `markdown.js` only knows `#` headings, so the line and its `=====` become one paragraph.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md starts "Code style", then a line of =',
    async run(page, act) {
      await withBody(page, 'Code style\n==========\n\n- Four spaces, no tabs; lines up to 120 characters.\n- Prefer `val` over `var`.\n');
      await expect(page.locator('#detail .markdown li').first()).toHaveText('Four spaces, no tabs; lines up to 120 characters.');
      await act.pause();
    },
  },
  {
    caption: '"Code style" should be a heading, with no ===== left',
    async run(page) {
      await expect(page.locator('#detail .markdown h1')).toHaveText('Code style');
    },
  },
];
