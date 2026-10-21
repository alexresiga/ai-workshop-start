import { expect, type Page } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

/** The scan's answer, edited in the browser: a repository where code-style has a copy deep in a plugin's test data. */
async function withCopy(page: Page) {
  await page.route('**/api/scan?*', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.skills[0].copies = ['plugins/kotlinGradlePluginIntegrationTests/src/testData/multiplatformProjectWithSharedSources/.claude/skills/code-style/SKILL.md'];
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.locator('#repository a').waitFor();
}

export const title = 'A long path in "also in …" runs past the right edge on a phone and scrolls the SKILL.md sideways';
export const expected =
  '`spec/web.md`, the page: "Fits the window, at any width, a phone\'s 375 px too: no sideways scroll; … a long name, description or path cut with …, a long word wrapped". ' +
  'The copy\'s path in `.copies code` neither wraps nor is cut, so `#detail` gets wider than the window.';
export const steps: Step[] = [
  {
    caption: 'A 375 px window, and code-style with a copy at a long path',
    async run(page, act) {
      await page.setViewportSize({ width: 375, height: 720 });
      await withCopy(page);
      await expect(page.locator('#detail .copies')).toContainText('also in plugins/');
      await act.pause();
    },
  },
  {
    caption: 'The SKILL.md should fit the window: no sideways scroll',
    async run(page) {
      await page.locator('#detail .copies').scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator('#detail').evaluate((detail) => detail.scrollWidth - detail.clientWidth)).toBeLessThanOrEqual(0);
    },
  },
];
