// A link's text may hold balanced brackets (#80), against spec/web.md, on example/fixture. Its SKILL.md bodies have no
// brackets in a link's text, so each scene gives the first skill's SKILL.md another body, as the scan answers it.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** The scan's answer, edited in the browser: the first skill's SKILL.md with another body. */
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

const paragraph = (page: Page) => page.locator('#detail .markdown p');

export const title = "A link's text may hold balanced brackets";
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: '"Read [the [beta] guide](…)." is "Read the [beta] guide.", "the [beta] guide" a link',
    covers: ["a link's text may hold balanced brackets"],
    async run(page, act) {
      await withBody(page, 'Read [the [beta] guide](https://kotlinlang.org/docs).\n');
      await expect(paragraph(page)).toHaveText('Read the [beta] guide.');
      await expect(paragraph(page).locator('a')).toHaveText('the [beta] guide');
      await expect(paragraph(page).locator('a')).toHaveAttribute('href', 'https://kotlinlang.org/docs');
      await act.pause(1500);
    },
  },
  {
    caption: 'An unbalanced [ is text; in [a [b](…) c](…) only b is a link',
    covers: ['an unbalanced `[` is text'],
    async run(page, act) {
      await withBody(page, 'See [the [docs](https://kotlinlang.org/docs).\n\n[a [b](https://kotlinlang.org/b) c](https://kotlinlang.org/v)\n');
      await expect(paragraph(page).first()).toHaveText('See [the docs.');
      await expect(paragraph(page).first().locator('a')).toHaveText('docs');
      await expect(paragraph(page).nth(1)).toHaveText('[a b c](https://kotlinlang.org/v)');
      await expect(paragraph(page).nth(1).locator('a')).toHaveCount(1);
      await expect(paragraph(page).nth(1).locator('a')).toHaveText('b');
      await act.pause(1500);
    },
  },
  {
    caption: 'A code span still binds tighter than the link\'s text: "[the `[beta` guide](…)": its unbalanced [ in code, still a link',
    covers: ['a code span binds tighter than emphasis'],
    async run(page, act) {
      await withBody(page, 'Read [the `[beta` guide](https://kotlinlang.org/docs).\n');
      await expect(paragraph(page)).toHaveText('Read the [beta guide.');
      await expect(paragraph(page).locator('a > code')).toHaveText('[beta');
      await act.pause(1500);
    },
  },
];
