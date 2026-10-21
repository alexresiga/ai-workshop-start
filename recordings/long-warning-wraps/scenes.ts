// A long word in a warning wraps (#87), against spec/web.md. The page opens on example/fixture, scanned, with one warning,
// for release-checklist; its path is swapped in the scan's answer for one deep in a repository, as the red agent found the bug.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** A skill deep in a repository, its folders with no hyphen to break at. */
const LONG = 'plugins/kotlinGradlePluginIntegrationTests/src/integrationTestSources/.claude/skills/releaseChecklist/SKILL.md';

/** No sideways scroll: the page is as wide as the window. */
const pageWidth = (page: Page) => page.locator('html').evaluate((html) => html.scrollWidth);

export const title = 'A long path in a warning wraps on a phone';
export const notShown = {
  'a code block or a table wider than the window scrolls in its own box':
    'the fixture has no code block or table wider than a phone; tests/layout.test.ts shows it with one',
};
// The recorder compares each scene's end to its 1280 × 720 video, so a scene that narrows the window widens it again before it ends.
const WIDE = { width: 1280, height: 720 };

export const scenes: Scene[] = [
  {
    caption: "At a phone's 375 px, the warning names a skill deep in a repository: the path wraps, no sideways scroll",
    covers: ['a long word wrapped, in a warning too'],
    async run(page, act) {
      await page.route('**/api/scan?*', async (route) => {
        const response = await route.fetch();
        const json = await response.json();
        json.warnings = json.warnings.map((warning: string) => warning.replace('.agents/skills/release-checklist/SKILL.md', LONG));
        await route.fulfill({ response, json });
      });
      await page.reload();
      await page.setViewportSize({ width: 375, height: 720 });
      await expect(page.locator('#warnings-toggle')).toHaveText('⚠ 1 warning');
      await act.pause(800);
      await act.click(page.locator('#warnings-toggle'));
      const warning = page.locator('#warnings li');
      await expect(warning).toContainText(LONG);
      const box = (await warning.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(375);
      await expect.poll(() => pageWidth(page)).toBe(375);
      await act.pause(1500);
      await page.setViewportSize(WIDE);
      await expect.poll(() => pageWidth(page)).toBe(1280);
      await act.pause(800);
    },
  },
];
