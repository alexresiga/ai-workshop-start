// A 30-second demo of the web view (#54), not a change: scan an organization, and its skills cluster by themselves.
// Recorded with `--base HEAD`, so no spec clause changes and no scene covers one: only after-light.mp4 is the demo.
// JetBrains, as the tests answer it (tests/helpers.ts): 7 skills in 3 of 5 repositories, numbered by name: 1 a, 2 b,
// 3 build, 4 c, 5 lint, 6 release, 7 review. A small server of the scene's own passes the stream on at a reading pace.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const status = (page: Page) => page.locator('#clusters #clustering');
const skillsBar = (page: Page) => status(page).getByRole('progressbar', { name: 'Skills clustered' });
const toggle = (page: Page, theme: string) => page.locator('#clusters .theme h3 button.toggle', { hasText: theme });
const skills = (page: Page, theme: string) => page.locator('#clusters .theme', { has: page.locator('h3 button.toggle', { hasText: theme }) }).locator('li');
/** The answer, as the model streams it: build, lint; then release, a, b, c; then review. */
const PARTS = ['{"clusters": [{"theme": "Build", "skills": [3, 5, ', '6]}, {"theme": "Docs", "skills": [1, 2, 4]}, ', '{"theme": "Review", "skills": [7]}]}'];

export async function ask(_prompt: string, _signal?: AbortSignal, partial?: (text: string) => void): Promise<string> {
  PARTS.forEach((_, index) => partial?.(PARTS.slice(0, index + 1).join('')));
  return PARTS.join('');
}

/** How long before each line goes on: the first; each repository; the scan; the model; each part of its answer. */
type Line = { progress?: unknown; scan?: unknown; clustering?: unknown; clustered?: unknown };
const pace = (line: Line, previous: Line | undefined) =>
  !previous ? 900 : line.progress ? 500 : line.scan ? 400 : line.clustering !== undefined ? 300
    : line.clustered ? (previous.clustering !== undefined ? 3500 : 1300) : 1100;

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

export const title = 'Skill Atlas: an organization’s skills, clustered';
export const scenes: Scene[] = [
  {
    caption: 'Type an organization, JetBrains, and press Scan',
    covers: [],
    async run(page, act) {
      const url = await paced();
      await page.route('**/api/clusters/progress?*', (route) => route.continue({ url: `${url}?url=${encodeURIComponent(route.request().url())}` }));
      const input = page.getByLabel('Repository or organization link');
      await input.clear();
      await act.type(input, 'JetBrains');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(page.locator('#skills')).toContainText('Listing JetBrains’s repositories…');
    },
  },
  {
    caption: 'Each of its repositories scanned in turn, with a progress bar',
    covers: [],
    async run(page) {
      await expect(page.locator('#skills')).toContainText('Scanned 3 of 5 repositories');
      await expect(page.locator('.summary h2')).toHaveText('JetBrains', { timeout: 15_000 });
    },
  },
  {
    caption: '7 skills in 3 of 5 repositories, most skills first',
    covers: [],
    async run(page) {
      await expect(page.locator('.summary p').first()).toHaveText('7 skills in 3 of 5 repositories.');
      await expect(page.locator('#skills .name')).toHaveText(['JetBrains/idea', 'JetBrains/android', 'JetBrains/kotlin']);
    },
  },
  {
    caption: 'The skills cluster by themselves, with haiku: no button to press',
    covers: [],
    async run(page, act) {
      await expect(status(page)).toHaveText('Clustering 7 skills with haiku…');
      await expect(skillsBar(page)).toHaveJSProperty('value', 0);
      await act.pause(1000);
    },
  },
  {
    caption: 'The bar moves on as haiku’s answer streams in',
    covers: [],
    async run(page) {
      await expect(status(page)).toHaveText('Clustered 2 of 7 skills with haiku…');
      await expect(status(page)).toHaveText('Clustered 6 of 7 skills with haiku…');
    },
  },
  {
    caption: '7 skills in 3 clusters: Build, Docs and Review, each with its count',
    covers: [],
    async run(page, act) {
      await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
      await expect(page.locator('#clusters .theme h3')).toHaveText(['Build3 skills', 'Docs3 skills', 'Review1 skill']);
      await act.pause(1500);
    },
  },
  {
    caption: 'Open Build: build, lint and release, each linked to its SKILL.md, with its repository',
    covers: [],
    async run(page, act) {
      await act.click(toggle(page, 'Build'));
      await expect(toggle(page, 'Build')).toHaveAttribute('aria-expanded', 'true');
      await expect(skills(page, 'Build')).toHaveText([
        'buildJetBrains/kotlinRun the build.',
        'lintJetBrains/androidRun the lint.',
        'releaseJetBrains/kotlinRun the release.',
      ]);
      await act.pause(1000);
    },
  },
  {
    caption: 'Open Docs: a, b and c, from JetBrains/idea',
    covers: [],
    async run(page, act) {
      await act.click(toggle(page, 'Docs'));
      await expect(skills(page, 'Docs')).toHaveText(['aJetBrains/ideaRun the a.', 'bJetBrains/ideaRun the b.', 'cJetBrains/ideaRun the c.']);
      await act.pause(1400);
    },
  },
  {
    caption: 'And Review: review, from JetBrains/android. Every skill in exactly one cluster',
    covers: [],
    async run(page, act) {
      await act.click(toggle(page, 'Review'));
      await expect(skills(page, 'Review')).toHaveText(['reviewJetBrains/androidRun the review.']);
      await act.pause(1000);
    },
  },
];
