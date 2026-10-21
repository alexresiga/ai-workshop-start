// A quote's lazy continuation (#63), against spec/web.md. The page opens on example/fixture, scanned, code-style selected;
// each scene gives code-style's SKILL.md another body, as the scan's answer, and reloads.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** The scan's answer, with code-style's SKILL.md given this body. */
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

export const title = "A quote's second line without \">\" stays in the quote";
export const scenes: Scene[] = [
  {
    caption: 'A quote whose second line has no ">": both lines are the quote, "Never push to main on a Friday."',
    covers: ["a line with no `>` right after a quoted line goes on with the quote's paragraph"],
    async run(page, act) {
      await withBody(page, '> Never push to main\non a Friday.\n');
      const markdown = page.locator('#detail .markdown');
      await expect(markdown.locator('blockquote')).toHaveText('Never push to main on a Friday.');
      await expect(markdown.locator(':scope > p')).toHaveCount(0);
      await act.pause(1500);
    },
  },
  {
    caption: 'A blank line ends the quote, and so does code: the line after each is a paragraph of its own',
    covers: ['a blank line or a new block ends the quote'],
    async run(page, act) {
      await withBody(page, '> Never push to main\n\non a Friday.\n\n> ```\n> git push\n> ```\nnot on a Friday.\n');
      const markdown = page.locator('#detail .markdown');
      await expect(markdown.locator('blockquote')).toHaveCount(2);
      await expect(markdown.locator('blockquote').first()).toHaveText('Never push to main');
      await expect(markdown.locator('blockquote').last()).toHaveText('git push');
      await expect(markdown.locator(':scope > p')).toHaveText(['on a Friday.', 'not on a Friday.']);
      await act.pause(1500);
    },
  },
];
