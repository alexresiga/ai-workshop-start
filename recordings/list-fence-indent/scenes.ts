// A fence takes its own indentation off its lines (issue #98), against spec/web.md. The fixture has no such fence, so
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

export const title = 'A fence indented under a list item takes that indentation off: "npm test", not "  npm test"';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: '"- Run the tests:", then a fence indented 4 spaces with "npm test": the code is "npm test", as in the fence below it',
    covers: ['a fence takes its own indentation off its lines'],
    async run(page, act) {
      await withBody(page, '- Run the tests:\n\n    ```\n    npm test\n    ```\n\n```\nnpm test\n```\n');
      await expect(page.locator('#detail .markdown li pre code')).toHaveJSProperty('textContent', 'npm test');
      await expect(page.locator('#detail .markdown > pre code')).toHaveJSProperty('textContent', 'npm test');
      await act.pause();
    },
  },
  {
    caption: 'A fence indented 3 spaces: "a" loses its 3, "b", indented less, its 2, "c" has none; "d", indented 5, keeps 2',
    covers: ['a line indented less keeps what is left'],
    async run(page, act) {
      await withBody(page, '   ```\n   a\n  b\nc\n     d\n   ```\n');
      await expect(page.locator('#detail .markdown pre code')).toHaveJSProperty('textContent', 'a\nb\nc\n  d');
      await act.pause();
    },
  },
];
