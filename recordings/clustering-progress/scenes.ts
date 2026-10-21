// A progress bar while haiku clusters an organization's skills (#35), against spec/web.md, on JetBrains as the tests answer it
// (tests/helpers.ts): 7 skills in 3 of 5 repositories, numbered by name: 1 a, 2 b, 3 build, 4 c, 5 lint, 6 release, 7 review.
// The model streams its answer in three parts; the web view's own /api/clusters/progress runs as it is, and a small server of
// the scene's own passes its lines on at a reading pace, so each step stays on screen.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, type ElementHandle, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const button = (page: Page, name = 'Cluster skills') => page.getByRole('button', { name, exact: true });
const status = (page: Page) => page.locator('#clusters #clustering');
const text = (page: Page) => status(page).locator('.text');
const skillsBar = (page: Page) => status(page).getByRole('progressbar', { name: 'Skills clustered' });

/**
 * The answer, as the model streams it: after `[3, 5`, 3 is whole, 5 may yet be 50: 1 skill; then build (3) again and 9, not in
 * the list, neither counted: 5; then 4 and 6: all 7.
 */
const PARTS = ['{"clusters": [{"theme": "Build", "skills": [3, 5', ', 3, 9, 1, 2]}, {"theme": "Review", "skills": [7, ', '4, 6]}]}'];

/** The model: its answer, part by part. */
export async function ask(_prompt: string, _signal?: AbortSignal, partial?: (text: string) => void): Promise<string> {
  PARTS.forEach((_, index) => partial?.(PARTS.slice(0, index + 1).join('')));
  return PARTS.join('');
}

/** How long before each line goes on: the first, so the listing shows; each repository; the model's steps; the answer. */
const pace = (line: { progress?: unknown }, first: boolean) => (first ? 1500 : line.progress ? 1000 : 2000);

/** Passes on the stream at `?url=`, line by line, at `pace`. */
let pacing: Server | undefined;
async function paced(): Promise<string> {
  pacing ??= createServer(async (request, response) => {
    const real = await fetch(new URL(request.url!, 'http://x').searchParams.get('url')!);
    response.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    const lines = (await real.text()).trim().split('\n');
    for (const [index, line] of lines.entries()) {
      await new Promise((resolve) => setTimeout(resolve, pace(JSON.parse(line), index === 0)));
      response.write(line + '\n');
    }
    response.end();
  }).unref();
  if (!pacing.listening) await new Promise<void>((resolve) => pacing!.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(pacing.address() as AddressInfo).port}/`;
}

/** The spinner as clustering starts: the same element to the end. */
let spinner: ElementHandle | null = null;

export const title = 'A progress bar while haiku clusters the skills';
export const notShown = {
  'The model: **haiku**': 'the server’s claude -p has nothing on screen; tests/organization-clusters.test.ts checks its arguments',
  'the answer, its last `result` line': 'claude’s raw output has nothing on screen; tests/organization-clusters.test.ts reads it streamed',
  '`CLAUDE`, optional': 'the server’s environment has nothing on screen; tests/organization-clusters.test.ts runs a fake claude',
  '`GET /api/clusters/progress': 'the stream has nothing on screen, only what the page makes of it; tests/organization-clusters.test.ts',
  '`{ clustering }`': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  '`{ clustered: { skills, of } }`': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  'the answer of `/api/clusters`': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
};
export const scenes: Scene[] = [
  {
    caption: 'Scan JetBrains, then Cluster skills: “Listing JetBrains’s repositories…”, the button disabled',
    covers: ['the button disabled'],
    async run(page, act) {
      const input = page.getByLabel('Repository or organization link');
      await input.clear();
      await act.type(input, 'JetBrains');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(page.locator('.summary p').first()).toHaveText('7 skills in 3 of 5 repositories.');
      const url = await paced();
      await page.route('**/api/clusters/progress?*', (route) => route.continue({ url: `${url}?url=${encodeURIComponent(route.request().url())}` }));
      await act.click(button(page));
      await expect(text(page)).toHaveText('Listing JetBrains’s repositories…');
      spinner = await status(page).locator('.spinner').elementHandle();
      await expect(button(page, 'Clustering…')).toBeDisabled();
    },
  },
  {
    caption: 'The organization scanned again, as its own scan shows it: “Scanned 3 of 5 repositories” and the repositories’ bar',
    covers: ['as the organization\'s own scan shows them'],
    async run(page) {
      await expect(text(page)).toHaveText('Scanned 3 of 5 repositories', { timeout: 10_000 });
      const bar = status(page).getByRole('progressbar', { name: 'Repositories scanned' });
      await expect(bar).toHaveJSProperty('value', 3);
      await expect(bar).toHaveJSProperty('max', 5);
    },
  },
  {
    caption: 'Then haiku: “Clustering 7 skills with haiku…”, and a bar of the skills from 0 in the repositories’ bar’s place',
    covers: ['and a **progress bar** of'],
    async run(page) {
      await expect(text(page)).toHaveText('Clustering 7 skills with haiku…', { timeout: 10_000 });
      await expect(skillsBar(page)).toHaveJSProperty('value', 0);
      await expect(skillsBar(page)).toHaveJSProperty('max', 7);
      await expect(status(page).locator('progress')).toHaveCount(1);
    },
  },
  {
    caption: 'The answer so far, “[3, 5”: 3 is whole, 5 may still grow; “Clustered 1 of 7 skills with haiku…”',
    covers: ['as the model\'s answer streams', 'How far the model is'],
    async run(page) {
      await expect(text(page)).toHaveText('Clustered 1 of 7 skills with haiku…', { timeout: 10_000 });
      await expect(skillsBar(page)).toHaveJSProperty('value', 1);
    },
  },
  {
    caption: 'Then “3, 5, 3, 9, 1, 2] … [7,”: build named again and 9, not in the list, do not count; 5 of 7',
    covers: ['a number not in the list, or named again, does not'],
    async run(page) {
      await expect(text(page)).toHaveText('Clustered 5 of 7 skills with haiku…', { timeout: 10_000 });
      await expect(skillsBar(page)).toHaveJSProperty('value', 5);
    },
  },
  {
    caption: 'All 7 placed: the bar full, and the same spinner turning since clustering began',
    covers: ['the same spinner throughout'],
    async run(page) {
      await expect(text(page)).toHaveText('Clustered 7 of 7 skills with haiku…', { timeout: 10_000 });
      await expect(skillsBar(page)).toHaveJSProperty('value', 7);
      expect(await spinner!.evaluate((node) => node.isConnected && !!node.closest('#clustering'))).toBe(true);
    },
  },
  {
    caption: 'The answer: 7 skills in 2 clusters, the bar gone, the button enabled again',
    covers: ['the bar moving on'],
    async run(page) {
      await expect(page.locator('#clusters > p')).toHaveText('7 skills in 2 clusters.', { timeout: 10_000 });
      await expect(page.locator('#clusters .theme h3')).toHaveText(['Build4 skills', 'Review3 skills']);
      await expect(page.locator('#clusters progress')).toHaveCount(0);
      await expect(button(page)).toBeEnabled();
    },
  },
];
