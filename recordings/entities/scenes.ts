// An entity reference in a SKILL.md is its character (issue #88), against spec/web.md. The fixture has no such line, so
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

export const title = 'An entity reference is its character: Replace <version> & tag it.';
export const notShown = {
  '`GET /markdown.js` and `GET /entities.js`': 'what the server sends the page has nothing on screen of its own',
  '`src/entities.js` generated': 'how a source file is generated has nothing on screen',
};
export const scenes: Scene[] = [
  {
    caption: 'code-style\'s SKILL.md says "Replace &lt;version&gt; &amp; tag it.": it reads "Replace <version> & tag it."',
    covers: ['An entity reference in the body is its character'],
    async run(page, act) {
      await withBody(page, 'Replace &lt;version&gt; &amp; tag it.\n');
      await expect(page.locator('#detail .markdown p')).toHaveText('Replace <version> & tag it.');
      await act.pause();
    },
  },
  {
    caption: 'Any HTML5 name, a decimal or a hex reference: "&copy; 2026 &mdash; issue &#35;88 &#x2713;" is "© 2026 — issue #88 ✓"',
    covers: ['any HTML5 name'],
    async run(page, act) {
      await withBody(page, '&copy; 2026 &mdash; issue &#35;88 &#x2713;\n');
      await expect(page.locator('#detail .markdown p')).toHaveText('\u00a9 2026 \u2014 issue #88 \u2713');
      await act.pause();
    },
  },
  {
    caption: 'Code point 0, one past U+10FFFF and a surrogate are each the replacement character, �',
    covers: ['code point 0'],
    async run(page, act) {
      await withBody(page, 'Bad: &#0; &#x110000; &#xD800;\n');
      await expect(page.locator('#detail .markdown p')).toHaveText('Bad: \uFFFD \uFFFD \uFFFD');
      await act.pause();
    },
  },
  {
    caption: 'An unknown name, or one with no ;, reads as typed: "AT&T &nosuch; &amp more"',
    covers: ['an unknown name'],
    async run(page, act) {
      await withBody(page, 'AT&T &nosuch; &amp more\n');
      await expect(page.locator('#detail .markdown p')).toHaveText('AT&T &nosuch; &amp more');
      await act.pause();
    },
  },
  {
    caption: 'In a link\'s text and destination, an autolink and a bare URL: "<docs>" links to ?a=1&b=2, the others are ?x=1&y=2',
    covers: ["in text, a link's text and its destination"],
    async run(page, act) {
      await withBody(page, '[&lt;docs&gt;](https://kotlinlang.org/?a=1&amp;b=2), <https://kotlinlang.org/?x=1&amp;y=2> and https://kotlinlang.org/?x=1&amp;y=2\n');
      const links = page.locator('#detail .markdown p a');
      await expect(links.first()).toHaveText('<docs>');
      await expect(links.first()).toHaveAttribute('href', 'https://kotlinlang.org/?a=1&b=2');
      for (const link of [links.nth(1), links.nth(2)]) {
        await expect(link).toHaveText('https://kotlinlang.org/?x=1&y=2');
        await expect(link).toHaveAttribute('href', 'https://kotlinlang.org/?x=1&y=2');
      }
      await act.pause();
    },
  },
  {
    caption: 'In code, and after a backslash, &amp; stays as typed',
    covers: ['not in code, nor after a backslash'],
    async run(page, act) {
      await withBody(page, 'Run `echo &amp;` and \\&amp;\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph.locator('code')).toHaveText('echo &amp;');
      await expect(paragraph).toHaveText('Run echo &amp; and &amp;');
      await act.pause();
    },
  },
  {
    caption: 'The character is text: "&ast;not italic&ast; &lt;b&gt;bold?&lt;/b&gt;" has no italics and no bold, only text',
    covers: ['the character is text, never Markdown nor HTML'],
    async run(page, act) {
      await withBody(page, '&ast;not italic&ast; &lt;b&gt;bold?&lt;/b&gt;\n');
      const paragraph = page.locator('#detail .markdown p');
      await expect(paragraph).toHaveText('*not italic* <b>bold?</b>');
      await expect(paragraph.locator('*')).toHaveCount(0);
      await act.pause();
    },
  },
];
