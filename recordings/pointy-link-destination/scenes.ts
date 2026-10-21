// A link's destination in <…> may hold a space (issue #101), against spec/web.md. The fixture has no such line, so
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

export const title = 'A link to a path with a space: Read [the guide](<docs/my guide.md>).';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "Read [the guide](<docs/my guide.md>).": "the guide" links docs/my%20guide.md next to it',
    covers: ['"the guide" a link to'],
    async run(page, act) {
      await withBody(page, 'Read [the guide](<docs/my guide.md>).\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('Read the guide.');
      await expect(paragraph.locator('a')).toHaveText('the guide');
      await expect(paragraph.locator('a')).toHaveAttribute('href', /\/code-style\/docs\/my%20guide\.md$/);
      await act.pause();
    },
  },
  {
    caption: 'In <…>, parentheses need no partner: "[the draft](<docs/my guide (draft.md>)" is a link too',
    covers: ["then it may hold spaces and parentheses"],
    async run(page, act) {
      await withBody(page, 'Read [the draft](<docs/my guide (draft.md>).\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('Read the draft.');
      await expect(paragraph.locator('a')).toHaveAttribute('href', /\/code-style\/docs\/my%20guide%20\(draft\.md$/);
      await act.pause();
    },
  },
  {
    caption: 'Now "[the guide](<docs/my guide.md)", with no closing >: it stays text, as on GitHub',
    covers: ['a `<` with no `>`'],
    async run(page, act) {
      await withBody(page, 'Read [the guide](<docs/my guide.md).\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('Read [the guide](<docs/my guide.md).');
      await expect(paragraph.locator('a')).toHaveCount(0);
      await act.pause();
    },
  },
];
