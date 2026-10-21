// A badge in a SKILL.md is one link, to where it goes (issue #99), against spec/web.md. The fixture has no badge, so
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

export const title = 'A badge is one link: [![build](https://ci.example.com/badge.svg)](https://ci.example.com)';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md has a badge: it is one link, "build", to the CI, not to badge.svg',
    covers: ['in a link\'s text it is that text alone, so a badge is one link'],
    async run(page, act) {
      await withBody(page, '[![build](https://ci.example.com/badge.svg)](https://ci.example.com)\n');
      const links = page.locator('#detail .markdown a');
      await expect(links).toHaveCount(1);
      await expect(links).toHaveText('build');
      await expect(links).toHaveAttribute('href', 'https://ci.example.com/');
      await act.pause();
    },
  },
  {
    caption: 'An image alone, "See ![logo](https://example.com/logo.png).", is a link to it, its text "logo"',
    covers: ['an image is a link to it'],
    async run(page, act) {
      await withBody(page, 'See ![logo](https://example.com/logo.png).\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('See logo.');
      await expect(paragraph.locator('a')).toHaveText('logo');
      await expect(paragraph.locator('a')).toHaveAttribute('href', 'https://example.com/logo.png');
      await act.pause();
    },
  },
  {
    caption: 'A link in a link\'s text, "[a [b](b.md) c](c.md)": only "b" is a link',
    covers: ['a link holds no other link'],
    async run(page, act) {
      await withBody(page, '[a [b](b.md) c](c.md)\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('[a b c](c.md)');
      await expect(paragraph.locator('a')).toHaveCount(1);
      await expect(paragraph.locator('a')).toHaveText('b');
      await act.pause();
    },
  },
  {
    caption: 'Balanced brackets stay in a link\'s text: "Read [the [beta] guide](…)." is "Read the [beta] guide."',
    covers: ['a link\'s text may hold balanced brackets'],
    async run(page, act) {
      await withBody(page, 'Read [the [beta] guide](https://kotlinlang.org/docs).\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('Read the [beta] guide.');
      await expect(paragraph.locator('a')).toHaveText('the [beta] guide');
      await act.pause();
    },
  },
];
