import { expect } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

export const ask = async () => '{"clusters":[{"theme":"Git","skills":[1,2]},{"theme":"Style","skills":[3]}]}';

export const title = "On a phone, an organization's cluster with a long skill name runs past the right edge and scrolls sideways";
export const expected =
  '`spec/web.md`, the page: "**Fits the window**, at any width, a phone\'s 375 px too: no sideways scroll; … a long name, ' +
  'description or path cut with …". A skill named `kotlin-multiplatform-gradle-plugin-release` in its cluster ' +
  'should fit the 375 px window; its row in `.theme li` is `white-space: nowrap`, and only the description can shrink, so the ' +
  'name and the repository push `#detail` wider than the window, and it scrolls sideways.';
export const steps: Step[] = [
  {
    caption: 'A 375 px window, the organization example; one skill named kotlin-multiplatform-gradle-plugin-release',
    async run(page, act) {
      await page.setViewportSize({ width: 375, height: 720 });
      await page.route('**/api/clusters/progress?*', async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replaceAll('"name":"commits"', '"name":"kotlin-multiplatform-gradle-plugin-release"');
        await route.fulfill({ response, body });
      });
      await page.goto(new URL('/?org=example', page.url()).href);
      await expect(page.locator('.theme')).toHaveCount(2);
      await act.pause();
    },
  },
  {
    caption: 'Open the Git cluster',
    async run(page, act) {
      await act.click(page.locator('.theme button.toggle').first());
      await expect(page.locator('.theme li a', { hasText: 'kotlin-multiplatform-gradle-plugin-release' })).toBeVisible();
    },
  },
  {
    caption: 'It should fit the window: no sideways scroll',
    async run(page) {
      await page.locator('#detail').evaluate((detail) => (detail.scrollLeft = detail.scrollWidth));
      await expect
        .poll(() => page.locator('#detail').evaluate((detail) => detail.scrollWidth - detail.clientWidth), { timeout: 3000 })
        .toBeLessThanOrEqual(0);
    },
  },
];
