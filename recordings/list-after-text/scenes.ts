// A list after a line of text, as on GitHub (#62), against spec/web.md. The page opens on example/fixture, scanned:
// code-style's SKILL.md is given another body in the browser, as the red agent found the bug.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** The scan's answer, edited in the browser: code-style's SKILL.md with another body. */
async function withBody(page: Page, body: string) {
  await page.unroute('**/api/scan?*');
  await page.route('**/api/scan?*', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.skills[0].body = body;
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.locator('#repository a').waitFor();
}

export const title = 'A list after a line of text, as on GitHub';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'A line starting "2024." inside a paragraph: one paragraph, "2024." in it, no list',
    covers: ['`2024. Use the new one.` is one paragraph'],
    async run(page, act) {
      await withBody(page, 'The format changed in\n2024. Use the new one.\n');
      const body = page.locator('#detail .markdown');
      await expect(body.locator('p')).toHaveText(['The format changed in 2024. Use the new one.']);
      await expect(body.locator('ol, ul')).toHaveCount(0);
      await act.pause();
    },
  },
  {
    caption: 'A line of text, then a list from 1 and a table, with no blank line: each is still a list and a table',
    covers: ['a table may follow a line of text'],
    async run(page, act) {
      await withBody(page, 'The steps:\n1. Read it.\n2. Use it.\n\nThe levels:\n| Level | Meaning |\n|---|---|\n| 1 | low |\n');
      const body = page.locator('#detail .markdown');
      await expect(body.locator('p')).toHaveText(['The steps:', 'The levels:']);
      await expect(body.locator('ol li')).toHaveText(['Read it.', 'Use it.']);
      await expect(body.locator('table td')).toHaveText(['1', 'low']);
      await act.pause();
    },
  },
];
