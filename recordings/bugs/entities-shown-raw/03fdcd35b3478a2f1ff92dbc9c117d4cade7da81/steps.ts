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

export const title = 'An entity in a SKILL.md (`&lt;version&gt;`, `&amp;`) shows as typed, not as "<version>" and "&"';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … paragraphs", as on GitHub, where an entity reference is its ' +
  'character (CommonMark, "Entity and numeric character references"): "Replace &lt;version&gt; &amp; tag it." reads ' +
  '"Replace <version> & tag it."; `markdown.js` leaves `&lt;`, `&gt;` and `&amp;` in the text. Still text, never HTML.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "Replace &lt;version&gt; &amp; tag it."',
    async run(page, act) {
      await withBody(page, 'Replace &lt;version&gt; &amp; tag it.\n');
      await expect(page.locator('#detail .markdown p')).toContainText('Replace');
      await act.pause();
    },
  },
  {
    caption: 'It should read "Replace <version> & tag it."',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).toHaveText('Replace <version> & tag it.');
    },
  },
];
