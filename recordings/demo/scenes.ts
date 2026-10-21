// The demo (#54), against spec/demo.md: Skill Atlas in 30 seconds, an organization scanned and its skills clustered by
// theme. On JetBrains as the tests answer it (tests/helpers.ts): 7 skills in 3 of 5 repositories, idea 3 (a, b, c),
// android 2 (lint, review), kotlin 2 (build, release); numbered by name for the model: 1 a, 2 b, 3 build, 4 c, 5 lint,
// 6 release, 7 review. The web view's own /api/clusters/progress runs as it is; a small server of the scene's own passes
// its lines on at a reading pace, so each step stays on screen, and the scenes wait for them by the clock.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

/** haiku's answer, as it streams: Build and release (build, release), Code quality (lint, review), General (a, b, c). */
const PARTS = [
  '{"clusters": [{"theme": "Build and release", "skills": [3, 6]}, ',
  '{"theme": "Code quality", "skills": [5, 7]}, ',
  '{"theme": "General", "skills": [1, 2, 4]}]}',
];

/** The model: the clusters, streamed in three parts, so 2, then 4, then 7 of the 7 skills are in a cluster. */
export async function ask(_prompt: string, _signal?: AbortSignal, partial?: (text: string) => void): Promise<string> {
  PARTS.forEach((_, index) => partial?.(PARTS.slice(0, index + 1).join('')));
  return PARTS.join('');
}

type Line = { progress?: unknown; scan?: unknown; clustering?: unknown; clustered?: unknown };
/**
 * How long before each line goes on, after the one before: the listing, each repository, the scan, the model asked, each
 * part of its answer, then the clusters. From the click on Scan: 0 of 5 at 1.8 s, 5 of 5 at 4.8 s, the repositories at
 * 6.3 s, the model at 9.8 s, 2, 4 and 7 of 7 at 11.3, 12 and 12.7 s, the clusters at 14.5 s: each as a scene begins.
 */
const pace = (line: Line, previous: Line | undefined) =>
  !previous ? 1800 : line.progress ? 600 : line.scan ? 1500 : line.clustering !== undefined ? 3500
    : line.clustered ? (previous.clustered ? 700 : 1500) : 1800;

/** Passes on the stream at `?url=`, line by line, at `pace`. */
let pacing: Server | undefined;
async function paced(): Promise<string> {
  pacing ??= createServer(async (request, response) => {
    const real = await fetch(new URL(request.url!, 'http://x').searchParams.get('url')!);
    response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    const lines = (await real.text()).trim().split('\n');
    for (const [index, line] of lines.entries()) {
      await new Promise((resolve) => setTimeout(resolve, pace(JSON.parse(line), index ? JSON.parse(lines[index - 1]) : undefined)));
      response.write(line + '\n');
    }
    response.end();
  }).unref();
  if (!pacing.listening) await new Promise<void>((resolve) => pacing!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(pacing.address() as AddressInfo).port}/`;
}

async function paceClusters(page: Page) {
  const url = await paced();
  await page.unroute('**/api/clusters/progress?*');
  await page.route('**/api/clusters/progress?*', (route) => route.continue({ url: `${url}?url=${encodeURIComponent(route.request().url())}` }));
}

/** Keeps, in the page, each text the scan's and the clustering's status show, in order: what a viewer saw, however fast. */
const watch = (page: Page) =>
  page.locator('body').evaluate((body) => {
    const seen: string[] = [];
    body.ownerDocument.defaultView.demoSeen = seen;
    new body.ownerDocument.defaultView.MutationObserver(() => {
      for (const node of body.querySelectorAll('#loading .text, #clustering .text')) {
        if (node.textContent && seen.at(-1) !== node.textContent) seen.push(node.textContent);
      }
    }).observe(body, { subtree: true, childList: true, characterData: true });
  });
const seen = (page: Page) => page.locator('body').evaluate((body) => body.ownerDocument.defaultView.demoSeen as string[]);

const loading = (page: Page) => page.locator('#skills #loading');
const status = (page: Page) => page.locator('#clusters #clustering');
const themes = (page: Page) => page.locator('#clusters .theme h3 button');
const theme = (page: Page, name: string) => page.locator('#clusters .theme', { has: page.locator('h3', { hasText: name }) });

/**
 * How long the scenes may run, from the first one's start, about 1 s into the video: past this, the last scene's hold and
 * the video's end, about 2 s, no longer fit in 30 s. On this process's clock: the page's runs at the recorder's fixed time.
 */
const BUDGET = 26_800;
let started = 0;

export const title = 'Skill Atlas in 30 seconds';
export const notShown = {
  'Skill Atlas in 30 seconds, to share': 'what the demo is for has nothing on screen: its scenes show each part of it',
  'recorded against a commit without this file': 'how the demo is recorded has nothing on screen',
  '**30 s at most**': 'a video’s length has nothing on screen: the ffprobe checks give each one’s; the last scene fails past 26.8 s of scenes',
  '`recordings/demo/post.md`': 'the post is a file, with nothing on screen; tests/demo.test.ts checks it',
};
export const scenes: Scene[] = [
  {
    caption: 'Type an organization, press Scan: Skill Atlas lists its repositories',
    covers: ['An organization typed in', '**Scan**: the spinner'],
    async run(page, act) {
      started = Date.now();
      await paceClusters(page);
      await watch(page);
      const input = page.getByLabel('Repository or organization link');
      await input.clear();
      await act.type(input, 'JetBrains');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(loading(page)).toHaveText('Listing JetBrains’s repositories…');
      await expect(loading(page).locator('.spinner')).toBeVisible();
      await expect(page.locator('#button')).toHaveText('Scanning…');
    },
  },
  {
    caption: 'Then it scans each of them, the bar moving on',
    covers: ['Its repositories scanned one by one'],
    async run(page, act) {
      // Out of the way of the list and the totals, below them.
      await page.mouse.move(230, 330, { steps: 20 });
      await act.pause(3350);
      await expect(loading(page)).toHaveText('Scanned 5 of 5 repositories');
      const bar = loading(page).getByRole('progressbar', { name: 'Repositories scanned' });
      await expect(bar).toHaveJSProperty('value', 5);
      await expect(bar).toHaveJSProperty('max', 5);
      expect(await seen(page)).toEqual([
        'Listing JetBrains’s repositories…',
        ...[0, 1, 2, 3, 4, 5].map((n) => `Scanned ${n} of 5 repositories`),
      ]);
    },
  },
  {
    caption: 'The repositories with skills, most first, and the totals',
    covers: ['Then those with skills, most first', 'the totals'],
    async run(page, act) {
      await act.pause(2000);
      await expect(page.locator('#skills button .name')).toHaveText(['JetBrains/idea', 'JetBrains/android', 'JetBrains/kotlin']);
      await expect(page.locator('#skills button .pill')).toHaveText(['3 skills', '2 skills', '2 skills']);
      await expect(page.locator('#count')).toHaveText('7 skills');
      await expect(page.locator('#repositories')).toHaveText('3 of 5 repositories');
      await expect(page.locator('.summary p').first()).toHaveText('7 skills in 3 of 5 repositories.');
    },
  },
  {
    caption: 'Then haiku clusters the skills by theme, by itself, as it answers',
    covers: ['Then haiku clusters the skills by theme'],
    async run(page, act) {
      await act.pause(3500);
      await expect(status(page)).toHaveText('Clustered 7 of 7 skills with haiku…');
      const bar = status(page).getByRole('progressbar', { name: 'Skills clustered' });
      await expect(bar).toHaveJSProperty('value', 7);
      await expect(bar).toHaveJSProperty('max', 7);
      await expect(page.getByRole('button', { name: 'Cluster skills' })).toBeHidden();
      expect((await seen(page)).slice(7)).toEqual([
        'Clustering 7 skills with haiku…',
        ...[2, 4, 7].map((n) => `Clustered ${n} of 7 skills with haiku…`),
      ]);
    },
  },
  {
    caption: '7 skills in 3 clusters: each a theme and its count, the largest first',
    covers: ['The clusters, collapsed'],
    async run(page, act) {
      await act.pause(1800);
      await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
      await expect(themes(page)).toHaveText(['General3 skills', 'Build and release2 skills', 'Code quality2 skills']);
      for (const button of await themes(page).all()) await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#clusters .theme li:visible')).toHaveCount(0);
    },
  },
  {
    caption: 'Open one: each skill links to its SKILL.md, with its repository',
    covers: ['Two opened, one after the other'],
    async run(page, act) {
      await act.click(themes(page).nth(1));
      await expect(themes(page).nth(1)).toHaveAttribute('aria-expanded', 'true');
      await expect(theme(page, 'Build and release').locator('li')).toHaveText([
        'buildJetBrains/kotlinRun the build.',
        'releaseJetBrains/kotlinRun the release.',
      ]);
      await expect(theme(page, 'Build and release').getByRole('link', { name: 'build', exact: true }))
        .toHaveAttribute('href', 'https://github.com/JetBrains/kotlin/blob/main/.agents/skills/build/SKILL.md');
      await act.pause(900);
    },
  },
  {
    caption: 'And another: what each skill does, in its first sentence',
    covers: ['the first sentence of its description'],
    async run(page, act) {
      await act.click(themes(page).nth(2));
      await expect(themes(page).nth(2)).toHaveAttribute('aria-expanded', 'true');
      await expect(theme(page, 'Code quality').locator('li')).toHaveText([
        'lintJetBrains/androidRun the lint.',
        'reviewJetBrains/androidRun the review.',
      ]);
      await expect(theme(page, 'Code quality').getByRole('link', { name: 'review', exact: true }))
        .toHaveAttribute('href', 'https://github.com/JetBrains/android/blob/main/.claude/skills/review/SKILL.md');
      await act.pause(900);
      expect(Date.now() - started).toBeLessThan(BUDGET);
    },
  },
];
