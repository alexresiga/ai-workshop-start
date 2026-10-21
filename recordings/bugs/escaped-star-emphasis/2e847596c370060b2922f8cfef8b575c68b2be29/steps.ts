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
  await page.locator('#repository a').waitFor();
}

export const title = 'An escaped star closes emphasis: `Use *\\*.kt* files` shows "\\" in italics, then ".kt* files"';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … emphasis", as on GitHub. An escaped `\\*` is a plain star and ' +
  'never ends emphasis: "Use *\\*.kt* files" is "Use *.kt files", "*.kt" in italics; `markdown.js` ends the emphasis at the `*` ' +
  'of the escape, leaving a backslash in italics and a stray star.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "Use *\\*.kt* files"',
    async run(page, act) {
      await withBody(page, 'Use *\\*.kt* files\n');
      await expect(page.locator('#detail .markdown p')).toContainText('Use');
      await act.pause();
    },
  },
  {
    caption: 'It should read "Use *.kt files", "*.kt" in italics',
    async run(page) {
      await expect(page.locator('#detail .markdown p')).toHaveText('Use *.kt files');
      await expect(page.locator('#detail .markdown p > em')).toHaveText('*.kt');
    },
  },
];
