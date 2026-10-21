// The web view fits the window (#37), against spec/web.md. The page opens on example/fixture, scanned:
// code-style, commits, release-checklist; the window is narrowed to a phone's 375 px, then widened again.
import { expect, type Locator, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** No sideways scroll: the page is as wide as the window. */
const pageWidth = (page: Page) => page.locator('html').evaluate((html) => html.scrollWidth);

/** Where it ends, side to side. */
const right = async (locator: Locator) => (await locator.boundingBox())!.x + (await locator.boundingBox())!.width;

export const title = 'The page fits the window';
export const notShown = {
  'a code block or a table wider than the window scrolls in its own box':
    'the fixture has no code block or table wider than a phone; tests/layout.test.ts shows it with one',
};
// The recorder compares each scene's end to its 1280 × 720 video, so a scene that narrows the window widens it again before it ends.
const WIDE = { width: 1280, height: 720 };

export const scenes: Scene[] = [
  {
    caption: "Narrow the window to a phone's 375 px: the header, the filter and each skill fit, no sideways scroll",
    covers: ["a phone's 375 px too: no sideways scroll"],
    async run(page, act) {
      await page.setViewportSize({ width: 375, height: 720 });
      await act.pause(800);
      await expect(page.locator('#scan')).toBeInViewport({ ratio: 1 });
      await expect(page.getByLabel('Filter skills')).toBeInViewport({ ratio: 1 });
      await expect(page.locator('nav button')).toHaveCount(3);
      for (const skill of await page.locator('nav button').all()) expect(await right(skill)).toBeLessThanOrEqual(375);
      await expect.poll(() => pageWidth(page)).toBe(375);
      await act.pause(1200);
      await page.setViewportSize(WIDE);
      await expect.poll(() => pageWidth(page)).toBe(1280);
    },
  },
  {
    caption: 'At 375 px the list is above the SKILL.md, the description of commits cut with …; wide, beside it',
    covers: ['the list beside the SKILL.md, or above it below 50rem', 'description or path cut with'],
    async run(page, act) {
      await page.setViewportSize({ width: 375, height: 720 });
      await act.click(page.locator('nav button', { hasText: 'commits' }));
      await expect(page.locator('#detail .front-matter')).toContainText('commits');
      const above = { list: (await page.locator('aside').boundingBox())!, detail: (await page.locator('#detail').boundingBox())! };
      expect(above.list.y + above.list.height).toBeLessThanOrEqual(above.detail.y);
      const description = page.locator('nav button', { hasText: 'commits' }).locator('.description');
      await expect(description).toHaveCSS('text-overflow', 'ellipsis');
      expect(await description.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
      await expect.poll(() => pageWidth(page)).toBe(375);
      await act.pause(1200);
      await page.setViewportSize(WIDE);
      await act.pause(800);
      const beside = { list: (await page.locator('aside').boundingBox())!, detail: (await page.locator('#detail').boundingBox())! };
      expect(beside.list.x + beside.list.width).toBeLessThanOrEqual(beside.detail.x);
      await expect.poll(() => pageWidth(page)).toBe(1280);
    },
  },
];
