// A code span binds tighter than emphasis (#73), against spec/web.md, on example/fixture. Its SKILL.md bodies have neither
// a code span in bold nor a table, so each scene gives the first skill's SKILL.md another body, as the scan answers it.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** The scan's answer, edited in the browser: the first skill's SKILL.md with another body. */
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

const markdown = (page: Page) => page.locator('#detail .markdown');

export const title = 'A code span inside bold stays whole';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: '"Pass `**kwargs` through" in ** **: all of it bold, **kwargs as code, its asterisks kept',
    covers: ['a code span binds tighter than emphasis'],
    async run(page, act) {
      await withBody(page, '**Pass `**kwargs` through**\n\n*a `b* c` d* and ~~old `~~` way~~\n');
      await expect(markdown(page).locator('p').first()).toHaveText('Pass **kwargs through');
      await expect(markdown(page).locator('p > strong')).toHaveCSS('font-weight', '700');
      await expect(markdown(page).locator('p > strong > code')).toHaveText('**kwargs');
      await expect(markdown(page).locator('p > em > code')).toHaveText('b* c');
      await expect(markdown(page).locator('p > del > code')).toHaveText('~~');
      await act.pause(1500);
    },
  },
  {
    caption: 'A table right after a line of text, no blank line between: still a table',
    covers: ['a table may follow a line of text with no blank line'],
    async run(page, act) {
      await withBody(page, 'Options:\n| Flag | Meaning |\n|---|---|\n| `**kwargs` | passed through |\n');
      await expect(markdown(page).locator('p')).toHaveText('Options:');
      await expect(markdown(page).locator('table td code')).toHaveText('**kwargs');
      await act.pause(1500);
    },
  },
];
