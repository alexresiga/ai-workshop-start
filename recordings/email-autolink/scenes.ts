// An email autolink in a SKILL.md is a mailto link (issue #90), against spec/web.md. The fixture has no such line, so
// code-style's body is swapped in the scan's answer, as the red agent found the bug.
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

export const title = 'An email autolink is a mailto link: Ask <kotlin-team@example.com>.';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "Ask <kotlin-team@example.com>.": no brackets, the address a mailto link',
    covers: ['An email autolink is a mailto link'],
    async run(page, act) {
      await withBody(page, 'Ask <kotlin-team@example.com>.\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('Ask kotlin-team@example.com.');
      await expect(paragraph.locator('a')).toHaveText('kotlin-team@example.com');
      await expect(paragraph.locator('a')).toHaveAttribute('href', 'mailto:kotlin-team@example.com');
      await act.pause();
    },
  },
  {
    caption: 'Now "Ask <a b@c.d>.": with a space it is not an address, so it stays text, brackets and all',
    covers: ['one that is not an address, `<a b@c.d>`, is text'],
    async run(page, act) {
      await withBody(page, 'Ask <a b@c.d>.\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('Ask <a b@c.d>.');
      await expect(paragraph.locator('a')).toHaveCount(0);
      await act.pause();
    },
  },
];
