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

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

export const title = 'A root-relative link (`[guide](/docs/guide.md)`) in a SKILL.md opens github.com/docs/guide.md, outside the repository';
export const expected =
  '`spec/web.md`, the SKILL.md: "Links in the body resolve next to the SKILL.md on GitHub". On GitHub, a link starting with `/` in a ' +
  'Markdown file is relative to the repository\'s root, so `[guide](/docs/guide.md)` in `example/fixture` goes to ' +
  '`https://github.com/example/fixture/blob/<commit>/docs/guide.md`; the page resolves it against `github.com` itself and links ' +
  'to `https://github.com/docs/guide.md`, a 404.';
export const steps: Step[] = [
  {
    caption: 'code-style\'s SKILL.md: "See [the guide](/docs/guide.md)."',
    async run(page, act) {
      await withBody(page, 'See [the guide](/docs/guide.md).\n');
      await expect(page.locator('#detail .markdown a')).toHaveText('the guide');
      await act.pause();
    },
  },
  {
    caption: 'The link should open docs/guide.md in example/fixture, at the scanned commit',
    async run(page) {
      await expect(page.locator('#detail .markdown a')).toHaveAttribute(
        'href',
        `https://github.com/example/fixture/blob/${COMMIT}/docs/guide.md`,
      );
    },
  },
];
