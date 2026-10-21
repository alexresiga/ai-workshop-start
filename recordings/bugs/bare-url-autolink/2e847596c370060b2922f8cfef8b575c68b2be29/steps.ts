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

export const title = 'A bare URL in a SKILL.md (`See https://kotlinlang.org/docs.`) is plain text, not a link as on GitHub';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … links". GitHub links a bare `http://`, `https://` or `www.` URL ' +
  'in a Markdown file (GFM\'s autolinks), without its trailing punctuation: "See https://kotlinlang.org/docs." has a link to ' +
  '`https://kotlinlang.org/docs`; the page shows the URL as text, so it cannot be clicked.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "See https://kotlinlang.org/docs."',
    async run(page, act) {
      await withBody(page, 'See https://kotlinlang.org/docs.\n');
      await expect(page.locator('#detail .markdown p')).toContainText('See');
      await act.pause();
    },
  },
  {
    caption: 'The URL should be a link to https://kotlinlang.org/docs',
    async run(page) {
      await expect(page.locator('#detail .markdown p a')).toHaveAttribute('href', 'https://kotlinlang.org/docs');
    },
  },
];
