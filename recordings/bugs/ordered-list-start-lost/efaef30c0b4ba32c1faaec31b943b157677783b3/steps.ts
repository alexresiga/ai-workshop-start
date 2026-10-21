import { expect, type Page } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

/** The scan's answer, edited in the browser: code-style's SKILL.md with a numbered list that goes on from step 3. */
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

export const title = 'A numbered list that starts at 3 is shown numbered 1, 2';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … lists". `3. Run the tests.` then `4. Commit.` are steps 3 and 4, as on GitHub; ' +
  'the page drops the start number (a list node has no attributes in `markdown.js`), so the steps read 1 and 2.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "Then:", and steps 3. and 4.',
    async run(page, act) {
      await withBody(page, '# Code style\n\nThen:\n\n3. Run the tests.\n4. Commit.\n');
      await expect(page.locator('#detail .markdown ol li')).toHaveText(['Run the tests.', 'Commit.']);
      await act.pause();
    },
  },
  {
    caption: 'The list should be numbered from 3, as written',
    async run(page) {
      await expect(page.locator('#detail .markdown ol')).toHaveJSProperty('start', 3);
    },
  },
];
