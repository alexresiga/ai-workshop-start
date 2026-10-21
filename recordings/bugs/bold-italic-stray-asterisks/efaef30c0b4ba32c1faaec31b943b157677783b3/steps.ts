import { expect, type Page } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

/** The scan's answer, edited in the browser: code-style's SKILL.md with `***Never***`, strong and emphasis at once. */
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

export const title = '`***Never***` in a SKILL.md shows as "*Never*" in bold, its stars left in the text';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … emphasis". `***Never***` is strong and emphasised, as on GitHub: ' +
  'the paragraph reads "Never commit tabs.", with no `*` left.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md says "***Never*** commit tabs."',
    async run(page, act) {
      await withBody(page, '# Code style\n\n***Never*** commit tabs.\n');
      await expect(page.locator('#detail .markdown h1')).toHaveText('Code style');
      await act.pause();
    },
  },
  {
    caption: 'It should read "Never commit tabs.", no stars left',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).toHaveText('Never commit tabs.');
    },
  },
];
