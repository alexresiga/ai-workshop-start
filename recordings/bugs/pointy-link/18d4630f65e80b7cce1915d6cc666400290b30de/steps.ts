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
  await page.locator('#detail .markdown').waitFor();
}

export const title = 'A link to a path with a space (`[the guide](<docs/my guide.md>)`) shows as raw Markdown, not a link';
export const expected =
  '`spec/web.md`, the SKILL.md: "links", "Links in the body resolve next to the SKILL.md on GitHub". On GitHub (CommonMark\'s link ' +
  'destinations) a destination in `<…>` may hold spaces: "the guide" is a link to `docs/my%20guide.md` next to the SKILL.md';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md says "Read [the guide](<docs/my guide.md>)."',
    async run(page, act) {
      await withBody(page, 'Read [the guide](<docs/my guide.md>).\n');
      await expect(page.locator('#detail .markdown p')).toBeVisible();
      await act.pause();
    },
  },
  {
    caption: '"the guide" should be a link to docs/my guide.md, next to the SKILL.md',
    async run(page, act) {
      await act.pause();
      await expect(page.locator('#detail .markdown p')).toHaveText('Read the guide.');
      await expect(page.locator('#detail .markdown a')).toHaveAttribute('href', /\/\.github\/skills\/code-style\/docs\/my%20guide\.md$/);
    },
  },
];
