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

export const title = '`*Always **run** the tests*` in a SKILL.md shows stray stars: "Always **run" in italics, then "* the tests*"';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … emphasis", as on GitHub. ' +
  '"*Always **run** the tests*" is "Always run the tests" in italics, "run" in bold too, no star left; `markdown.js` ends the ' +
  'emphasis at the first `*` of the closing `**`.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "*Always **run** the tests*"',
    async run(page, act) {
      await withBody(page, '*Always **run** the tests*\n');
      await expect(page.locator('#detail .markdown p')).toContainText('Always');
      await act.pause();
    },
  },
  {
    caption: 'It should read "Always run the tests", in italics, "run" in bold, no star',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).toHaveText('Always run the tests');
      await expect(page.locator('#detail .markdown p > em > strong')).toHaveText('run');
    },
  },
];
