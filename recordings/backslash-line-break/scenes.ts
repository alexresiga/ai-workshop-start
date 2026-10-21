// A line ending in \ is a line break (issue #89), against spec/web.md. The fixture has no such line, so code-style's
// body is swapped in the scan's answer, as the red agent found the bug.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** The scan's answer, edited in the browser: code-style's SKILL.md with another body. */
async function withBody(page: Page, body: string) {
  await page.unroute('**/api/scan?*');
  await page.route('**/api/scan?*', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.skills[0].body = body;
    await route.fulfill({ response, json });
  });
  await page.reload();
  await page.locator('#repository a').waitFor();
}

export const title = 'A line ending in \\ is a line break: "Tag the release.\\", then "Push the tag."';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "Tag the release.\\", then "Push the tag.": two lines, no backslash',
    covers: ['is a **line break**, as on GitHub'],
    async run(page, act) {
      await withBody(page, 'Tag the release.\\\nPush the tag.\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).not.toContainText('\\');
      await expect(paragraph.locator('> br')).toHaveCount(1);
      expect(await paragraph.evaluate((p) => (p as HTMLElement).innerText)).toBe('Tag the release.\nPush the tag.');
      await act.pause();
    },
  },
  {
    caption: 'Two spaces at the end of "Tag the release." break the line too; with no \\ nor spaces, it is one line',
    covers: ["A paragraph's lines are joined with a space"],
    async run(page, act) {
      await withBody(page, 'Tag the release.  \nPush the tag.\n\nBuild it\nand ship it.\n');
      const [first, second] = [page.locator('#detail .markdown p').first(), page.locator('#detail .markdown p').nth(1)];
      expect(await first.evaluate((p) => (p as HTMLElement).innerText)).toBe('Tag the release.\nPush the tag.');
      await expect(second).toHaveText('Build it and ship it.');
      await expect(second.locator('br')).toHaveCount(0);
      await act.pause();
    },
  },
  {
    caption: 'A \\ at the end of the paragraph, escaped as \\\\, or in code is text: "Done.\\", "a\\ b", `x\\ y`',
    covers: ['the `\\` is text'],
    async run(page, act) {
      await withBody(page, 'a\\\\\nb `x\\\ny`\n\nDone.\\\n');
      const paragraphs = page.locator('#detail .markdown p');
      await expect(paragraphs.first()).toHaveText('a\\ b x\\ y');
      await expect(paragraphs.first().locator('code')).toHaveText('x\\ y');
      await expect(paragraphs.first().locator('br')).toHaveCount(0);
      await expect(paragraphs.nth(1)).toHaveText('Done.\\');
      await act.pause();
    },
  },
];
