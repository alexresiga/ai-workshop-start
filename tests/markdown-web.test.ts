// spec/web.md: the SKILL.md body's reference links, on the page, in a real browser, with GitHub answering from
// tests/helpers.ts: the case the red agent found (issue #72), and a relative one, which resolves next to the SKILL.md.
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { searchAnswers } from './helpers.ts';

const SKILL = [
  '---',
  'name: references',
  'description: Reference links.',
  '---',
  'See [the guide][guide].',
  '',
  '[guide]: https://example.com/guide',
  '',
].join('\n');
const RELATIVE = ['---', 'name: relative', 'description: A relative reference link.', '---', '[Docs][] and [none][].', '', '[docs]: docs/a.md', ''].join('\n');

const answers = replay({
  ...searchAnswers('example/references', { '.claude/skills/references/SKILL.md': SKILL }),
  ...searchAnswers('example/relative', { '.claude/skills/relative/SKILL.md': RELATIVE }),
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

browserTest('a reference link reads as its text, linked to its definition; the definition is not shown', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/references`);
  await expect(page.locator('#detail .markdown')).toHaveText('See the guide.');
  await expect(page.locator('#detail .markdown a')).toHaveText('the guide');
  await expect(page.locator('#detail .markdown a')).toHaveAttribute('href', 'https://example.com/guide');
});

browserTest('a relative reference link resolves next to the SKILL.md on GitHub; one with no definition is text', async (t) => {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/relative`);
  await expect(page.locator('#detail .markdown')).toHaveText('Docs and [none][].');
  await expect(page.locator('#detail .markdown a')).toHaveAttribute(
    'href',
    /^https:\/\/github\.com\/example\/relative\/blob\/[0-9a-f]+\/\.claude\/skills\/relative\/docs\/a\.md$/,
  );
});
