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


export const title = 'A task list (`- [ ] Tag the release`) shows "[ ]" and "[x]" as text, not checkboxes';
export const expected =
  '`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … lists", as on GitHub, where `- [ ] Tag the release` and ' +
  '`- [x] Write the notes` are task list items (GFM, "Task list items"): a checkbox, unticked then ticked, and the text alone; ' +
  '`markdown.js` leaves `[ ]` and `[x]` at the start of each item.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "- [ ] Tag the release", "- [x] Write the notes"',
    async run(page, act) {
      await withBody(page, '- [ ] Tag the release\n- [x] Write the notes\n');
      await expect(page.locator('#detail .markdown li')).toHaveCount(2);
      await act.pause();
    },
  },
  {
    caption: 'Each item should be a checkbox, unticked then ticked, and its text alone',
    async run(page) {
      await expect(page.locator('#detail .markdown li')).toHaveText(['Tag the release', 'Write the notes']);
      const boxes = page.locator('#detail .markdown li input[type="checkbox"]');
      await expect(boxes).toHaveCount(2);
      await expect(boxes.nth(0)).not.toBeChecked();
      await expect(boxes.nth(1)).toBeChecked();
    },
  },
];
