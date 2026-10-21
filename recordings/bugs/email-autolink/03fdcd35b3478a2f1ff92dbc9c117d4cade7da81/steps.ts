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


export const title = 'An email autolink (`<kotlin-team@example.com>`) shows its angle brackets, not a mailto link';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … links … only http, https and mailto links", as on GitHub, ' +
  'where `<kotlin-team@example.com>` is an email autolink (CommonMark, "Autolinks"): "Ask kotlin-team@example.com.", the address ' +
  'a link to `mailto:kotlin-team@example.com`; `markdown.js` reads `<https://…>` autolinks only, and leaves this one as text.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "Ask <kotlin-team@example.com>."',
    async run(page, act) {
      await withBody(page, 'Ask <kotlin-team@example.com>.\n');
      await expect(page.locator('#detail .markdown p')).toContainText('Ask');
      await act.pause();
    },
  },
  {
    caption: 'It should read "Ask kotlin-team@example.com.", the address a mailto link',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).toHaveText('Ask kotlin-team@example.com.');
      await expect(page.locator('#detail .markdown p a')).toHaveAttribute('href', 'mailto:kotlin-team@example.com');
    },
  },
];
