// The header fits the window at any width (#39), against spec/web.md. The JetBrains organization (tests/helpers.ts):
// 7 skills in 3 of 5 repositories; just above 50rem, its pills used to run past the right edge.
// The recorder films a 1280 × 720 window, so the page itself is narrowed to 820 px, a red line at its edge: above 50rem,
// as an 820 px window is, the header lays out the same. tests/header.test.ts checks real windows, 1280 to 320 px.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const WIDTH = 820;
const HEADER = ['header h1', '#scan', '#dice', '#repository a', '#repository .pill:not(#repositories)', '#repositories'];

/** The right edge of each part of the header, and how far the header's content reaches. */
const measure = (page: Page) =>
  page.evaluate(`(${JSON.stringify(HEADER)}).map((s) => document.querySelector(s).getBoundingClientRect().right)
    .concat(document.querySelector('header').scrollWidth)`) as Promise<number[]>;

export const title = 'The header fits the window';
export const notShown = {
  'a name too long for a line breaks within it':
    'the fixture has no name that long, and the recorder films one 1280 px window: tests/header.test.ts scans one at 360 px',
};
export const scenes: Scene[] = [
  {
    caption: 'The page 820 px wide: the organization and its 3 of 5 repositories pill go on the next line',
    covers: ['what does not fit on its line goes on the next'],
    async run(page, act) {
      await page.goto(new URL('/?org=JetBrains', page.url()).href);
      await expect(page.locator('#repositories')).toHaveText('3 of 5 repositories');
      await act.pause(600);
      await page.addStyleTag({ content: `html { width: ${WIDTH}px; box-shadow: 3px 0 0 #d33; }` });
      await act.pause(800);
      const form = (await page.locator('#scan').boundingBox())!;
      const repository = (await page.locator('#repository').boundingBox())!;
      expect(repository.y).toBeGreaterThan(form.y + form.height);
      await expect(page.locator('#repositories')).toBeVisible();
    },
  },
  {
    caption: 'All of the header is left of the 820 px edge: the whole pill shows, nothing to scroll sideways',
    covers: ['never past the right edge nor into a sideways scroll'],
    async run(page, act) {
      await act.pause(600);
      const [header, ...rights] = (await measure(page)).reverse();
      for (const right of rights) expect(right).toBeLessThanOrEqual(WIDTH);
      expect(header).toBeLessThanOrEqual(WIDTH);
    },
  },
];
