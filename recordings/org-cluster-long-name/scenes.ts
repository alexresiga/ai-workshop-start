// A long skill name in an organization's cluster fits a phone (#71), against spec/web.md. The page opens on example/fixture;
// the organization example has only that repository: code-style, commits, release-checklist, numbered 1, 2, 3 by name.
// Its clusters are answered with commits renamed kotlin-multiplatform-gradle-plugin-release, as the red agent found the bug.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

export const ask = async () => '{"clusters":[{"theme":"Git","skills":[1,2]},{"theme":"Style","skills":[3]}]}';

const LONG = 'kotlin-multiplatform-gradle-plugin-release';
/** No sideways scroll: the page and the SKILL.md side are as wide as the window. */
const overflow = (page: Page) =>
  page.locator('#detail').evaluate((detail) => detail.scrollWidth - detail.clientWidth + detail.ownerDocument.documentElement.scrollWidth - innerWidth);
const rows = (page: Page) => page.locator('#clusters .theme li:visible');
// The recorder compares each scene's end to its 1280 × 720 video, so a scene that narrows the window widens it again before it ends.
const WIDE = { width: 1280, height: 720 };

export const title = "A long skill name in an organization's cluster fits a phone";
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: `A 375 px window, the organization example, its skill commits named ${LONG}; open the Git cluster: one line each`,
    covers: ["the description's *first sentence*, on one line"],
    async run(page, act) {
      await page.setViewportSize({ width: 375, height: 720 });
      await page.route('**/api/clusters/progress?*', async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replaceAll('"name":"commits"', `"name":"${LONG}"`);
        await route.fulfill({ response, body });
      });
      await page.goto(new URL('/?org=example', page.url()).href);
      await expect(page.locator('.theme')).toHaveCount(2);
      await act.click(page.locator('.theme button.toggle').first());
      await expect(rows(page)).toHaveCount(2);
      for (const row of await rows(page).all()) {
        const lines = await row.evaluate((li) => getComputedStyle(li).whiteSpace);
        expect(lines).toBe('nowrap');
        const box = (await row.boundingBox())!;
        expect(box.height).toBeLessThan(40);
      }
      await act.pause(1200);
      await page.setViewportSize(WIDE);
      await act.pause(800);
    },
  },
  {
    caption: 'The long name and its repository cut with …, inside the window: no sideways scroll',
    covers: ['repository or sentence cut with …, so a cluster fits the window'],
    async run(page, act) {
      await page.setViewportSize({ width: 375, height: 720 });
      await act.pause(800);
      const name = page.locator('.theme li a', { hasText: LONG });
      await expect(name).toHaveCSS('text-overflow', 'ellipsis');
      expect(await name.evaluate((link) => link.scrollWidth > link.clientWidth)).toBe(true);
      for (const part of await rows(page).locator('a, .in, .description').all()) {
        const box = (await part.boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(375);
      }
      await page.locator('#detail').evaluate((detail) => (detail.scrollLeft = detail.scrollWidth));
      await expect.poll(() => overflow(page), { timeout: 3000 }).toBeLessThanOrEqual(0);
      await act.pause(1200);
      await page.setViewportSize(WIDE);
      await act.pause(800);
    },
  },
];
