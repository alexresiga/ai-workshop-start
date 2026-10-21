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

export const title = '"**Pass `**kwargs` through**" in a SKILL.md loses its code: the bold ends inside the backticks';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … code, … emphasis", as on GitHub, where a code span binds ' +
  'tighter than emphasis. "**Pass `**kwargs` through**" is "Pass **kwargs through" in bold, with `**kwargs` as code; ' +
  '`markdown.js` closes the bold at the `**` inside the backticks.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "**Pass `**kwargs` through**"',
    async run(page, act) {
      await withBody(page, '**Pass `**kwargs` through**\n');
      await expect(page.locator('#detail .markdown p')).toContainText('Pass');
      await act.pause();
    },
  },
  {
    caption: 'It should read "Pass **kwargs through", in bold, **kwargs as code',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).toHaveText('Pass **kwargs through');
      await expect(page.locator('#detail .markdown p > strong > code')).toHaveText('**kwargs');
    },
  },
];
