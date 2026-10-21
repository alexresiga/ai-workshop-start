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
  await page.locator('#detail .markdown').waitFor();
}

export const title = 'A badge (`[![build](https://ci.example.com/badge.svg)](https://ci.example.com)`) is a link inside a link, to the image, not the CI';
export const expected =
  '`spec/web.md`, the SKILL.md: "a link holds no other link", as on GitHub, where the badge is one link, to https://ci.example.com. ' +
  'Here its image becomes a link inside that one: a click on "build" opens badge.svg';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md has a badge: [![build](https://ci.example.com/badge.svg)](https://ci.example.com)',
    async run(page, act) {
      await withBody(page, '[![build](https://ci.example.com/badge.svg)](https://ci.example.com)\n');
      await expect(page.locator('#detail .markdown p')).toHaveText('build');
      await act.pause();
    },
  },
  {
    caption: 'It should be one link, with no link inside it',
    async run(page, act) {
      await act.pause();
      await expect(page.locator('#detail .markdown a')).toHaveCount(1);
    },
  },
];
