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

export const title = 'A fenced code block indented under a list item keeps its indentation: "  npm test", not "npm test"';
export const expected =
  '`spec/web.md`, the SKILL.md: "lists, code, fenced or indented, as it is", "as on GitHub". On GitHub (CommonMark\'s fenced code blocks) ' +
  'a fence indented in its item takes that indentation off its lines: the code is `npm test`';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "- Run the tests:", a fence indented 4 spaces with "npm test"; then the same fence, not in a list',
    async run(page, act) {
      await withBody(page, '- Run the tests:\n\n    ```bash\n    npm test\n    ```\n\n```bash\nnpm test\n```\n');
      await expect(page.locator('#detail .markdown li pre code')).toBeVisible();
      await act.pause();
    },
  },
  {
    caption: 'The item\'s code should be "npm test", as in the fence below it, with no spaces before it',
    async run(page, act) {
      await act.pause();
      await expect(page.locator('#detail .markdown li pre code')).toHaveJSProperty('textContent', 'npm test');
    },
  },
];
