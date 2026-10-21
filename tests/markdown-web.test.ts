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
  ...searchAnswers('example/autolink', {
    '.claude/skills/code-style/SKILL.md': '---\nname: code-style\ndescription: Kotlin style.\n---\nSee https://kotlinlang.org/docs.\n',
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
