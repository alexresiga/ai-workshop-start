// A task list in a SKILL.md: checkboxes, as on GitHub (issue #91), against spec/web.md. The fixture has no such list, so
// code-style's body is swapped in the scan's answer, as the red agent found the bug.
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

export const title = 'A task list: - [ ] Tag the release, - [x] Write the notes';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "- [ ] Tag the release", "- [x] Write the notes": a box, unticked then ticked, and the text alone',
    covers: ['A list item that starts with `[ ]` or `[x]`'],
    async run(page, act) {
      await withBody(page, '- [ ] Tag the release\n- [x] Write the notes\n');
      const items = page.locator('#detail .markdown li');
      await expect(items).toHaveText(['Tag the release', 'Write the notes']);
      const boxes = items.locator('> input[type=checkbox]');
      await expect(boxes.nth(0)).not.toBeChecked();
      await expect(boxes.nth(1)).toBeChecked();
      await expect(items.nth(0)).toHaveCSS('list-style-type', 'none');
      await expect(boxes.nth(0)).toBeDisabled();
      await act.pause();
    },
  },
  {
    caption: 'A loose list, a blank line between its items: each box is in its item\'s paragraph',
    covers: ["in a loose list, the box is in the item's first paragraph"],
    async run(page, act) {
      await withBody(page, '- [x] Write the notes\n\n- [ ] Tag the release\n');
      const boxes = page.locator('#detail .markdown li > p > input[type=checkbox]');
      await expect(boxes).toHaveCount(2);
      await expect(boxes.nth(0)).toBeChecked();
      await expect(boxes.nth(1)).not.toBeChecked();
      await expect(page.locator('#detail .markdown li > p')).toHaveText(['Write the notes', 'Tag the release']);
      await act.pause();
    },
  },
  {
    caption: '"- [ ]" alone, "- [y] Ship", "- [x]Ship" and "- \\[ ] Ship" are text: no box',
    covers: ['`[ ]` with no text after it'],
    async run(page, act) {
      await withBody(page, '- [ ]\n- [y] Ship\n- [x]Ship\n- \\[ ] Ship\n');
      const items = page.locator('#detail .markdown li');
      await expect(items).toHaveText(['[ ]', '[y] Ship', '[x]Ship', '[ ] Ship']);
      await expect(page.locator('#detail .markdown input')).toHaveCount(0);
      await act.pause();
    },
  },
];
