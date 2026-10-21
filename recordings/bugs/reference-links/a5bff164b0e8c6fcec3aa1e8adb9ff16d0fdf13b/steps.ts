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

export const title = 'A reference link (`[the guide][guide]`) shows its brackets, and its `[guide]: https://…` line as a paragraph';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … links", as on GitHub. ' +
  '"See [the guide][guide]." with `[guide]: https://example.com/guide` below it reads "See the guide.", "the guide" a link to ' +
  'https://example.com/guide, and the definition line is not shown; `markdown.js` knows only inline links, `[text](url)`.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "See [the guide][guide]." and "[guide]: https://example.com/guide"',
    async run(page, act) {
      await withBody(page, 'See [the guide][guide].\n\n[guide]: https://example.com/guide\n');
      await expect(page.locator('#detail .markdown p').first()).toContainText('See');
      await act.pause();
    },
  },
  {
    caption: 'It should read "See the guide.", a link to https://example.com/guide, and nothing else',
    async run(page) {
      await expect(page.locator('#detail .markdown')).toHaveText('See the guide.');
      await expect(page.locator('#detail .markdown a')).toHaveAttribute('href', 'https://example.com/guide');
    },
  },
];
