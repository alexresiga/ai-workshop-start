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

export const title = '`my__init__` in a SKILL.md shows "my" and a bold "init", its underscores gone';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … emphasis", as on GitHub. ' +
  'Underscores inside a word are not emphasis: GitHub shows "Call my__init__ first." as it is; ' +
  '`markdown.js` has no `(?<!\\w)` before `__` for strong, as it has for `_`, so it makes "init" bold and drops the four underscores.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "Call my__init__ first."',
    async run(page, act) {
      await withBody(page, 'Call my__init__ first.\n');
      await expect(page.locator('#detail .markdown p')).toContainText('Call my');
      await act.pause();
    },
  },
  {
    caption: 'It should read "Call my__init__ first.", nothing bold',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).toHaveText('Call my__init__ first.');
    },
  },
];
