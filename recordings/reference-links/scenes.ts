// Reference links in the SKILL.md body (issue #72), against spec/web.md. The fixture has none, so each scene gives
// code-style's SKILL.md another body, as the red agent did; the expected text worked out by hand from that body.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

let body = '';
/** The pages already answered with `body`: each theme records on a page of its own. */
const routed = new WeakSet<Page>();

/** The scan's answer, edited in the browser: code-style's SKILL.md with `text` as its body. */
async function withBody(page: Page, text: string) {
  if (!routed.has(page)) {
    routed.add(page);
    await page.route('**/api/scan?*', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      json.skills.find((skill: { name: string }) => skill.name === 'code-style').body = body;
      await route.fulfill({ response, json });
    });
  }
  body = text;
  await page.reload();
  await page.locator('#repository a').waitFor();
}

const markdown = (page: Page) => page.locator('#detail .markdown');

export const title = 'Reference links in a SKILL.md';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: '"See [the guide][guide].", "[Docs][]" and "[docs]", with their [label]: url lines: links, the lines not shown',
    covers: ['reference links, `[text][label]`'],
    async run(page, act) {
      await withBody(page, 'See [the guide][guide].\n\n[Docs][] and [docs].\n\n[guide]: https://example.com/guide\n[docs]: https://example.com/docs\n');
      await expect(markdown(page)).toHaveText('See the guide.Docs and docs.');
      await expect(markdown(page).locator('a')).toHaveText(['the guide', 'Docs', 'docs']);
      await expect(markdown(page).locator('a').first()).toHaveAttribute('href', 'https://example.com/guide');
      await expect(markdown(page).locator('a').last()).toHaveAttribute('href', 'https://example.com/docs');
      await act.pause();
    },
  },
  {
    caption: '"[the guide][The  GUIDE]" matches "[the guide]: …/first", in any case, spaces collapsed; the second line is ignored',
    covers: ['a label in any case', 'the first line of a label counts'],
    async run(page, act) {
      await withBody(page, 'See [the guide][The  GUIDE].\n\n[the guide]: https://example.com/first\n[THE GUIDE]: https://example.com/second\n');
      await expect(markdown(page)).toHaveText('See the guide.');
      await expect(markdown(page).locator('a')).toHaveAttribute('href', 'https://example.com/first');
      await act.pause();
    },
  },
  {
    caption: '"[the guide][nowhere]" has no [nowhere]: line, so it reads as it is written, brackets and all',
    covers: ['no such line'],
    async run(page, act) {
      await withBody(page, 'See [the guide][nowhere].\n');
      await expect(markdown(page)).toHaveText('See [the guide][nowhere].');
      await expect(markdown(page).locator('a')).toHaveCount(0);
      await act.pause();
    },
  },
];
