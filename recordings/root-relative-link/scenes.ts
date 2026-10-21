// A link starting with one / resolves from the repository's root (#79), against spec/web.md, on example/fixture. Its
// SKILL.md bodies have no links, so each scene gives the first skill's SKILL.md, code-style's, another body, as the scan answers it.
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

/** The fixture's root on GitHub, at the commit the recorder's scan pins. */
const ROOT = 'https://github.com/example/fixture/blob/0123456789abcdef0123456789abcdef01234567';
const link = (page: Page, name: string) => page.locator('#detail .markdown a', { hasText: name });

export const title = 'A link starting with / opens from the repository root';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: '"the guide" → /docs/guide.md: docs/guide.md in example/fixture, at the scanned commit',
    covers: ["from the repository's root at the scanned commit"],
    async run(page, act) {
      await withBody(page, '# Code style\n\nSee [the guide](/docs/guide.md).\n');
      await act.pause(800);
      await link(page, 'the guide').hover();
      await expect(link(page, 'the guide')).toHaveAttribute('href', `${ROOT}/docs/guide.md`);
      await act.pause(1500);
    },
  },
  {
    caption: '"the notes" → notes.md: next to code-style\'s SKILL.md, in .github/skills/code-style/',
    covers: ['resolve next to the SKILL.md'],
    async run(page, act) {
      await withBody(page, '# Code style\n\nSee [the guide](/docs/guide.md) and [the notes](notes.md).\n');
      await link(page, 'the notes').hover();
      await expect(link(page, 'the notes')).toHaveAttribute('href', `${ROOT}/.github/skills/code-style/notes.md`);
      await act.pause(1500);
    },
  },
  {
    caption: 'A javascript: link is plain text; https and mailto links stay links',
    covers: ['only http, https and mailto links'],
    async run(page, act) {
      await withBody(page, '# Code style\n\n[web](https://example.com) [mail](mailto:a@example.com) [script](javascript:alert(1))\n');
      await expect(link(page, 'web')).toHaveAttribute('href', 'https://example.com/');
      await expect(link(page, 'mail')).toHaveAttribute('href', 'mailto:a@example.com');
      await expect(link(page, 'script')).not.toHaveAttribute('href', /.*/);
      await act.pause(1500);
    },
  },
];
