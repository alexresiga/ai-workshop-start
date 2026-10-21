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

export const title = 'Three backticks in a sentence ("Wrap code in ``` fences; use `x` inline.") turn " fences; use " into code';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … code …", "as on GitHub". On GitHub (CommonMark\'s code spans) a run of ' +
  'backticks with no closing run of the same length is text: "```" stays as typed, and only `x` is code';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md says "Wrap code in ``` fences; use `x` inline."',
    async run(page, act) {
      await withBody(page, 'Wrap code in ``` fences; use `x` inline.\n');
      await expect(page.locator('#detail .markdown p')).toBeVisible();
      await act.pause();
    },
  },
  {
    caption: 'Only `x` should be code: the "```" is text, and so is " fences; use "',
    async run(page, act) {
      await act.pause();
      await expect(page.locator('#detail .markdown p code')).toHaveText(['x']);
    },
  },
];
