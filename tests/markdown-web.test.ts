// spec/web.md: the SKILL.md body as rendered Markdown, in a real browser, with GitHub answering from tests/helpers.ts.
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { searchAnswers } from './helpers.ts';

const answers = replay({
  ...searchAnswers('example/emphasis', {
    '.claude/skills/testing/SKILL.md': '---\nname: testing\ndescription: Run the tests.\n---\n*Always **run** the tests*\n',
  }),
  ...searchAnswers('example/entities', {
    '.claude/skills/release/SKILL.md': '---\nname: release\ndescription: Cut a release.\n---\nReplace &lt;version&gt; &amp; tag it.\n',
  }),
  ...searchAnswers('example/autolink', {
    '.claude/skills/code-style/SKILL.md': '---\nname: code-style\ndescription: Kotlin style.\n---\nSee https://kotlinlang.org/docs.\n',
  }),
  ...searchAnswers('example/badge', {
    '.github/skills/code-style/SKILL.md':
      '---\nname: code-style\ndescription: Kotlin style.\n---\n[![build](https://ci.example.com/badge.svg)](https://ci.example.com)\n',
  }),
  ...searchAnswers('example/email', {
    '.claude/skills/code-style/SKILL.md': '---\nname: code-style\ndescription: Kotlin style.\n---\nAsk <kotlin-team@example.com>.\n',
  }),
  ...searchAnswers('example/tilde', {
    '.claude/skills/code-style/SKILL.md': '---\nname: code-style\ndescription: Kotlin style.\n---\nUse ~old~ new names.\n',
  }),
  ...searchAnswers('example/tilde-url', {
    '.claude/skills/code-style/SKILL.md': '---\nname: code-style\ndescription: Kotlin style.\n---\nInstall to ~/bin, see [docs](https://example.edu/~jdoe/).\n',
  }),
  ...searchAnswers('example/tasks', {
    '.claude/skills/release/SKILL.md': '---\nname: release\ndescription: Release steps.\n---\n- [ ] Tag the release\n- [x] Write the notes\n',
  }),
  ...searchAnswers('example/line-break', {
    '.claude/skills/code-style/SKILL.md': '---\nname: code-style\ndescription: Kotlin style.\n---\nTag the release.\\\nPush the tag.\n',
  }),
});
const server = createWebServer({
  open: (url) => openGitHub(url, { fetch: answers, token: 'test' }),
  organization: () => Promise.reject(new Error('not scanned')),
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

// Chromium, as CI installs it: `npx playwright install --with-deps chromium`; one that cannot start skips the browser tests.
const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

browserTest('strong inside emphasis: "*Always **run** the tests*" is the words, in italics, "run" in bold, no star left', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/emphasis`);
  const paragraph = page.locator('#detail .markdown p');
  await expect(paragraph).toHaveText('Always run the tests');
  await expect(paragraph.locator('> em')).toHaveText('Always run the tests');
  await expect(paragraph.locator('> em > strong')).toHaveText('run');
});

browserTest('a bare URL is a link, without its trailing period: "See https://kotlinlang.org/docs."', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/autolink`);
  const paragraph = page.locator('#detail .markdown p');
  await expect(paragraph).toHaveText('See https://kotlinlang.org/docs.');
  await expect(paragraph.locator('a')).toHaveAttribute('href', 'https://kotlinlang.org/docs');
  await expect(paragraph.locator('a')).toHaveText('https://kotlinlang.org/docs');
});

browserTest('a badge is one link, to where it goes: "[![build](https://ci.example.com/badge.svg)](https://ci.example.com)"', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/badge`);
  const links = page.locator('#detail .markdown a');
  await expect(links).toHaveCount(1);
  await expect(links).toHaveText('build');
  await expect(links).toHaveAttribute('href', 'https://ci.example.com/');
});

browserTest('an email autolink is a mailto link, without its brackets: "Ask <kotlin-team@example.com>."', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/email`);
  const paragraph = page.locator('#detail .markdown p');
  await expect(paragraph).toHaveText('Ask kotlin-team@example.com.');
  await expect(paragraph.locator('a')).toHaveAttribute('href', 'mailto:kotlin-team@example.com');
  await expect(paragraph.locator('a')).toHaveText('kotlin-team@example.com');
});

browserTest('text in one tilde is struck out, its tildes gone: "Use ~old~ new names."', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/tilde`);
  const paragraph = page.locator('#detail .markdown p');
  await expect(paragraph).toHaveText('Use old new names.');
  await expect(paragraph.locator('del')).toHaveText('old');
  await expect(paragraph.locator('del')).toHaveCSS('text-decoration-line', 'line-through');
});

browserTest('a tilde in a link\'s destination strikes nothing out: "Install to ~/bin, see [docs](https://example.edu/~jdoe/)."', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/tilde-url`);
  const paragraph = page.locator('#detail .markdown p');
  await expect(paragraph).toHaveText('Install to ~/bin, see docs.');
  await expect(paragraph.locator('del')).toHaveCount(0);
  await expect(paragraph.locator('a')).toHaveAttribute('href', 'https://example.edu/~jdoe/');
});

browserTest('a task list: "- [ ] Tag the release" and "- [x] Write the notes" are checkboxes, unticked then ticked, and the text alone', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/tasks`);
  const items = page.locator('#detail .markdown li');
  await expect(items).toHaveText(['Tag the release', 'Write the notes']);
  const boxes = items.locator('> input[type=checkbox]');
  await expect(boxes).toHaveCount(2);
  await expect(boxes.nth(0)).not.toBeChecked();
  await expect(boxes.nth(1)).toBeChecked();
  await expect(boxes.nth(0)).toBeDisabled();
  // No bullet beside the box, as on GitHub.
  await expect(items.nth(0)).toHaveCSS('list-style-type', 'none');
});

browserTest('an entity reference is its character: "Replace &lt;version&gt; &amp; tag it." reads "Replace <version> & tag it."', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/entities`);
  const paragraph = page.locator('#detail .markdown p');
  await expect(paragraph).toHaveText('Replace <version> & tag it.');
  // Still text, never HTML.
  await expect(paragraph.locator('*')).toHaveCount(0);
});

browserTest('a line ending in a backslash is a line break, as on GitHub: "Tag the release.\\", then "Push the tag." are two lines, no backslash', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/line-break`);
  const paragraph = page.locator('#detail .markdown p');
  await expect(paragraph).toHaveText('Tag the release.Push the tag.');
  await expect(paragraph).not.toContainText('\\');
  await expect(paragraph.locator('> br')).toHaveCount(1);
  expect(await paragraph.evaluate((p) => p.innerText)).toBe('Tag the release.\nPush the tag.');
});
