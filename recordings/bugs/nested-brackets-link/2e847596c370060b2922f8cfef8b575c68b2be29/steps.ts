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

export const title = 'A link whose text has brackets (`[the [beta] guide](https://…)`) shows as raw Markdown, not a link';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … links". As on GitHub, a link\'s text may hold balanced brackets: ' +
  '"Read [the [beta] guide](https://kotlinlang.org/docs)." is "Read the [beta] guide.", "the [beta] guide" a link to ' +
  '`https://kotlinlang.org/docs`; `markdown.js` stops a link\'s text at its first `]`, so no link is found and the Markdown shows as it is.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "Read [the [beta] guide](https://kotlinlang.org/docs)."',
    async run(page, act) {
      await withBody(page, 'Read [the [beta] guide](https://kotlinlang.org/docs).\n');
      await expect(page.locator('#detail .markdown p')).toContainText('Read');
      await act.pause();
    },
  },
  {
    caption: 'It should read "Read the [beta] guide.", "the [beta] guide" a link',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).toHaveText('Read the [beta] guide.');
      await expect(page.locator('#detail .markdown p a')).toHaveAttribute('href', 'https://kotlinlang.org/docs');
    },
  },
];
