// A bare URL in a SKILL.md is a link (issue #82), against spec/web.md. The fixture has no such line, so code-style's
// body is swapped in the scan's answer, as the red agent found the bug.
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

export const title = 'A bare URL is a link: See https://kotlinlang.org/docs.';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "See https://kotlinlang.org/docs.": the URL is a link, its period is not',
    covers: ['A bare `http://`, `https://` or `www.` URL in the body is a link'],
    async run(page, act) {
      await withBody(page, 'See https://kotlinlang.org/docs.\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('See https://kotlinlang.org/docs.');
      await expect(paragraph.locator('a')).toHaveText('https://kotlinlang.org/docs');
      await expect(paragraph.locator('a')).toHaveAttribute('href', 'https://kotlinlang.org/docs');
      await act.pause();
    },
  },
  {
    caption: 'Now "Read www.kotlinlang.org/docs, then commit": the www. URL links to http://www.kotlinlang.org/docs',
    covers: ['`www.` links to `http://www.`'],
    async run(page, act) {
      await withBody(page, 'Read www.kotlinlang.org/docs, then commit\n');
      const link = page.locator('#detail .markdown p a');
      await expect(link).toHaveText('www.kotlinlang.org/docs');
      await expect(link).toHaveAttribute('href', 'http://www.kotlinlang.org/docs');
      await act.pause();
    },
  },
  {
    caption: 'A URL in code stays code, and one in a link\'s text is that link\'s text: one link, to the guide',
    covers: ["not in code, nor in a link's text"],
    async run(page, act) {
      await withBody(page, 'Run `curl https://kotlinlang.org/docs` or read [the guide at https://kotlinlang.org](https://kotlinlang.org/docs/home.html)\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph.locator('code')).toHaveText('curl https://kotlinlang.org/docs');
      await expect(paragraph.locator('a')).toHaveCount(1);
      await expect(paragraph.locator('a')).toHaveText('the guide at https://kotlinlang.org');
      await expect(paragraph.locator('a')).toHaveAttribute('href', 'https://kotlinlang.org/docs/home.html');
      await act.pause();
    },
  },
];
