import { expect } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

/** A GitHub link to a SKILL.md, deep in a repository: not a repository's link, so the server refuses it. */
const LINK = 'https://github.com/example/fixture/blob/main/plugins/kotlinGradlePluginIntegrationTests/src/testData/.claude/skills/code-style/SKILL.md';

export const title = 'A long link that cannot be scanned: its error message runs out of the list, which scrolls sideways';
export const expected =
  '`spec/web.md`, the page: "Fits the window, at any width …: no sideways scroll; … a long word wrapped". ' +
  'The error, "Not a GitHub repository URL: <link>", should wrap inside the list; `.message` has no `overflow-wrap`, so the link stays on one line and `#skills` scrolls sideways.';
export const steps: Step[] = [
  {
    caption: 'Paste a GitHub link to a SKILL.md deep in a repository',
    async run(page, act) {
      await page.locator('#url').fill(LINK);
      await act.pause();
      await expect(page.locator('#url')).toHaveValue(LINK);
    },
  },
  {
    caption: 'Scan: the list says it is not a repository link',
    async run(page, act) {
      await act.click(page.locator('#button'));
      await expect(page.locator('#skills .message.error')).toContainText('Not a GitHub repository URL');
      await act.pause();
    },
  },
  {
    caption: 'The message should wrap in the list: no sideways scroll',
    async run(page) {
      await expect.poll(() => page.locator('#skills').evaluate((list) => list.scrollWidth - list.clientWidth)).toBeLessThanOrEqual(0);
    },
  },
];
