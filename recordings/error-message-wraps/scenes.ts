// A long link that cannot be scanned (#61), against spec/web.md. The page opens on example/fixture, scanned:
// code-style, commits, release-checklist; then a GitHub link to a SKILL.md deep in a repository is scanned.
import { expect } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** A GitHub link to a SKILL.md, deep in a repository: not a repository's link, so the server refuses it. */
const LINK = 'https://github.com/example/fixture/blob/main/plugins/kotlinGradlePluginIntegrationTests/src/testData/.claude/skills/code-style/SKILL.md';

export const title = 'A long link in an error message wraps in the list';
export const notShown = {
  'a code block or a table wider than the window scrolls in its own box':
    'unchanged, on the same line of the spec; recordings/layout and tests/layout.test.ts show it',
};
export const scenes: Scene[] = [
  {
    caption: 'Scan a link to a SKILL.md deep in a repository: the error wraps in the list, no sideways scroll',
    covers: ['a link in a message in the list too'],
    async run(page, act) {
      await page.locator('#url').fill(LINK);
      await act.pause();
      await act.click(page.locator('#button'));
      await expect(page.locator('#skills .message.error')).toContainText('Not a GitHub repository URL: ' + LINK);
      await expect.poll(() => page.locator('#skills').evaluate((list) => list.scrollWidth - list.clientWidth)).toBeLessThanOrEqual(0);
      await expect.poll(() => page.locator('html').evaluate((html) => html.scrollWidth)).toBe(1280);
      await act.pause(1500);
    },
  },
];
