// spec/web.md: links in the body resolve next to the SKILL.md on GitHub, one starting with a single `/` from the
// repository's root at the scanned commit, as on GitHub; only http, https and mailto links. In a real browser.
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { chromium, expect, type Page } from '@playwright/test';
import { openGitHub } from '../src/core/github.ts';
import { replay } from '../src/core/replay.ts';
import { createWebServer } from '../src/web.ts';
import { searchAnswers } from './helpers.ts';

/** The commit searchAnswers pins. */
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const ROOT = `https://github.com/example/links/blob/${COMMIT}`;

const LINKS = [
  '---',
  'name: links',
  'description: Every kind of link.',
  '---',
  '- [next](docs/a.md)',
  '- [up](../shared/b.md)',
  '- [root](/docs/guide.md)',
  '- [top](/)',
  '- [host](//example.com/c)',
  '- [web](https://example.com/d)',
  '- [mail](mailto:someone@example.com)',
  '- [script](javascript:alert(1))',
  '',
].join('\n');

const server = createWebServer({
  open: (url) =>
    openGitHub(url, { fetch: replay(searchAnswers('example/links', { '.claude/skills/links/SKILL.md': LINKS })), token: 'test' }),
  organization: () => Promise.reject(new Error('not scanned')),
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => server.close());

// Chromium, as CI installs it: `npx playwright install --with-deps chromium`; one that cannot start skips the browser tests.
const browser = await chromium.launch().catch(() => undefined);
const browserTest = browser ? test : test.skip;
test.after(() => browser?.close());

async function open(t: { after(fn: () => Promise<void>): void }): Promise<Page> {
  const page = await browser!.newPage();
  t.after(() => page.close());
  await page.goto(`${base}/?repo=example/links`);
  await expect(page.locator('#detail .markdown')).toBeVisible();
  return page;
}

const link = (page: Page, name: string) => page.locator('#detail .markdown a', { hasText: name });

browserTest('a relative link resolves next to the SKILL.md, at the scanned commit', async (t) => {
  const page = await open(t);
  await expect(link(page, 'next')).toHaveAttribute('href', `${ROOT}/.claude/skills/links/docs/a.md`);
  await expect(link(page, 'up')).toHaveAttribute('href', `${ROOT}/.claude/skills/shared/b.md`);
});

browserTest('a link starting with one / resolves from the repository root, at the scanned commit, as on GitHub', async (t) => {
  const page = await open(t);
  await expect(link(page, 'root')).toHaveAttribute('href', `${ROOT}/docs/guide.md`);
  await expect(link(page, 'top')).toHaveAttribute('href', `${ROOT}/`);
});

browserTest('a link starting with // and an absolute link go where they say', async (t) => {
  const page = await open(t);
  await expect(link(page, 'host')).toHaveAttribute('href', 'https://example.com/c');
  await expect(link(page, 'web')).toHaveAttribute('href', 'https://example.com/d');
  await expect(link(page, 'mail')).toHaveAttribute('href', 'mailto:someone@example.com');
});

browserTest('only http, https and mailto links: any other is text', async (t) => {
  const page = await open(t);
  await expect(link(page, 'script')).toHaveCount(1);
  await expect(link(page, 'script')).not.toHaveAttribute('href', /.*/);
});
