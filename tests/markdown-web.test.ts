// spec/web.md: the SKILL.md body, rendered Markdown, as on GitHub; in a real browser, with GitHub answering from
// tests/helpers.ts: a paragraph with a line starting "2024.", as the red agent found it (issue #62).
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { searchAnswers } from './helpers.ts';

const SKILL = [
  '---',
  'name: formats',
  'description: The formats.',
  '---',
  'The format changed in',
  '2024. Use the new one.',
  '',
  'The steps:',
  '1. Read it.',
  '2. Use it.',
  '',
].join('\n');

const answers = replay(searchAnswers('example/formats', { '.claude/skills/formats/SKILL.md': SKILL }));
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

browserTest('a line starting "2024." stays in its paragraph; a list from 1 still follows a line of text', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/formats`);
  const body = page.locator('#detail .markdown');
  await expect(body.locator('p').first()).toHaveText('The format changed in 2024. Use the new one.');
  await expect(body.locator('p').nth(1)).toHaveText('The steps:');
  await expect(body.locator('ol')).toHaveCount(1);
  await expect(body.locator('ol li')).toHaveText(['Read it.', 'Use it.']);
});
