// Struck-out text in one tilde, as on GitHub (issue #100), against spec/web.md. The fixture has no tilde, so code-style's body
// is swapped in the scan's answer, as the red agent found the bug.
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

export const title = 'Struck out in one tilde: Use ~old~ new names.';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "Use ~old~ new names.", then "Use ~~old~~ new names.": "old" struck out each time, no tilde left',
    covers: ['Text in one tilde or two is struck out'],
    async run(page, act) {
      await withBody(page, 'Use ~old~ new names.\n\nUse ~~old~~ new names.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Use old new names.', 'Use old new names.']);
      await expect(paragraphs.locator('del')).toHaveText(['old', 'old']);
      await expect(paragraphs.locator('del').first()).toHaveCSS('text-decoration-line', 'line-through');
      await act.pause();
    },
  },
  {
    caption: '"~a~~" and "~~a~": the closing tildes are not as many as the opening ones, so it is text',
    covers: ['the closing tildes are as many as the opening ones'],
    async run(page, act) {
      await withBody(page, 'Use ~a~~ here.\n\nUse ~~a~ here.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Use ~a~~ here.', 'Use ~~a~ here.']);
      await expect(page.locator('#detail .markdown del')).toHaveCount(0);
      await act.pause();
    },
  },
  {
    caption: '"~~~a~~~", "~ a~" and "\\~a~" are text: three tildes, a space inside, an escaped tilde',
    covers: ['three or more, `~~~a~~~`'],
    async run(page, act) {
      await withBody(page, 'Use ~~~a~~~ here.\n\nUse ~ a~ here.\n\nUse \\~a~ here.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Use ~~~a~~~ here.', 'Use ~ a~ here.', 'Use ~a~ here.']);
      await expect(page.locator('#detail .markdown del')).toHaveCount(0);
      await act.pause();
    },
  },
  {
    caption: '"~/bin and ~/lib" is text: a tilde after punctuation, before a letter, closes nothing; "~(a)~" is struck out',
    covers: ['as in GFM, a tilde before punctuation opens only'],
    async run(page, act) {
      await withBody(page, 'Use ~/bin and ~/lib.\n\nUse ~(a)~ here.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Use ~/bin and ~/lib.', 'Use (a) here.']);
      await expect(page.locator('#detail .markdown del')).toHaveText(['(a)']);
      await act.pause();
    },
  },
  {
    caption: '"Install to ~/bin, see [docs](https://example.edu/~jdoe/).": nothing struck out, the link goes to ~jdoe',
    covers: ["a tilde in an autolink `<…>`, a link's destination or a bare URL"],
    async run(page, act) {
      await withBody(page, 'Install to ~/bin, see [docs](https://example.edu/~jdoe/).\n\nOpen https://example.edu/~jdoe/ or <https://example.edu/~jdoe/>.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Install to ~/bin, see docs.', 'Open https://example.edu/~jdoe/ or https://example.edu/~jdoe/.']);
      await expect(page.locator('#detail .markdown del')).toHaveCount(0);
      const links = page.locator('#detail .markdown a');
      await expect(links).toHaveCount(3);
      for (const link of await links.all()) await expect(link).toHaveAttribute('href', 'https://example.edu/~jdoe/');
      await act.pause();
    },
  },
  {
    caption: '"Build takes ~2 min. Old step ~deprecated~.": only "deprecated" is struck out; "~a ~b~ c~" is struck out, "b" twice',
    covers: ['a closing tilde ends the nearest one that opens'],
    async run(page, act) {
      await withBody(page, 'Build takes ~2 min. Old step ~deprecated~.\n\nUse ~a ~b~ c~ here.\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs).toHaveText(['Build takes ~2 min. Old step deprecated.', 'Use a b c here.']);
      await expect(paragraphs.nth(0).locator('del')).toHaveText(['deprecated']);
      await expect(paragraphs.nth(1).locator('> del')).toHaveText(['a b c']);
      await expect(paragraphs.nth(1).locator('> del > del')).toHaveText(['b']);
      await act.pause();
    },
  },
];
