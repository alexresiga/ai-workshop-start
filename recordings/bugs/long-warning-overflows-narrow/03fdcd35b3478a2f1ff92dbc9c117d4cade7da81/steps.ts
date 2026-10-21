import { expect } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

/** A skill deep in a repository, its folders with no hyphen to break at. */
const LONG = 'plugins/kotlinGradlePluginIntegrationTests/src/testData/.claude/skills/releaseChecklist/SKILL.md';

export const title = 'On a phone, a warning with a long path runs past the right edge and the page scrolls sideways';
export const expected =
  '`spec/web.md`, the page: "**Fits the window**, at any width, a phone\'s 375 px too: no sideways scroll; … a long word wrapped". ' +
  `A warning naming \`${LONG}\`, shown with \`⚠ 1 warning\`, should wrap in the 375 px ` +
  'window; `#warnings li` has no `overflow-wrap`, so the path stays on one line and widens the page.';
export const steps: Step[] = [
  {
    caption: 'A 375 px window; release-checklist\'s warning names a skill deep in a repository',
    async run(page, act) {
      await page.setViewportSize({ width: 375, height: 720 });
      await page.route('**/api/scan?*', async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        json.warnings = json.warnings.map((warning: string) => warning.replace('.agents/skills/release-checklist/SKILL.md', LONG));
        await route.fulfill({ response, json });
      });
      await page.reload();
      await expect(page.locator('#warnings-toggle')).toHaveText('⚠ 1 warning');
      await act.pause();
    },
  },
  {
    caption: 'Show the warning',
    async run(page, act) {
      await act.click(page.locator('#warnings-toggle'));
      await expect(page.locator('#warnings li')).toContainText(LONG);
      await act.pause();
    },
  },
  {
    caption: 'It should wrap in the window: no sideways scroll',
    async run(page) {
      await page.evaluate(() => window.scrollTo(document.documentElement.scrollWidth, 0));
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), { timeout: 3000 })
        .toBeLessThanOrEqual(0);
    },
  },
];
