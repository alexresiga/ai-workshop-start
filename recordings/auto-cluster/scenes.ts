// Cluster an organization's skills by themselves, from its one scan (#36), against spec/web.md, on JetBrains as the tests
// answer it (tests/helpers.ts): 7 skills in 3 of 5 repositories, numbered by name: 1 a, 2 b, 3 build, 4 c, 5 lint,
// 6 release, 7 review. The web view's own /api/clusters/progress runs as it is; a small server of the scene's own passes
// its lines on at a reading pace, so each step stays on screen.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';
// The web view's own error, as claude.ts throws it: a clear message, not an unexpected one.
import { AtlasError } from '../../src/core/errors.ts';

const button = (page: Page, name = 'Cluster skills') => page.getByRole('button', { name, exact: true });
const status = (page: Page) => page.locator('#clusters #clustering');
const skillsBar = (page: Page) => status(page).getByRole('progressbar', { name: 'Skills clustered' });
/** The answer, as the model streams it: build, lint (3, 5 once its `,` comes); then release, a, b, c; then review. */
const PARTS = ['{"clusters": [{"theme": "Build", "skills": [3, 5, ', '6]}, {"theme": "Docs", "skills": [1, 2, 4]}, ', '{"theme": "Review", "skills": [7]}]}'];

let asked = 0;
/**
 * The model, in turn, for each run: the clusters; then not logged in; then the clusters again, for Cluster skills; then
 * the clusters a moment later, which home drops.
 */
export async function ask(_prompt: string, _signal?: AbortSignal, partial?: (text: string) => void): Promise<string> {
  const turn = asked++ % 4;
  if (turn === 1) throw new AtlasError('claude could not cluster the skills: Not logged in · Please run /login');
  // The one home drops: slow enough for home to come first.
  if (turn === 3) await new Promise((done) => setTimeout(done, 2500));
  else PARTS.forEach((_, index) => partial?.(PARTS.slice(0, index + 1).join('')));
  return PARTS.join('');
}

/** How long before each line goes on: the first, so the listing shows; each repository; the scan; the model; the answer. */
type Line = { progress?: unknown; scan?: unknown; clustering?: unknown; clustered?: unknown };
/** The first clustered line waits longest, so "Clustering N skills" and its bar at 0 stay on screen past the scene before. */
const pace = (line: Line, previous: Line | undefined) =>
  !previous ? 1200 : line.progress ? 600 : line.scan ? 500 : line.clustering !== undefined ? 300
    : line.clustered ? (previous.clustering !== undefined ? 3000 : 1200) : 1500;

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

/** Scans the organization JetBrains from the input. */
async function scanJetBrains(page: Page, act: Parameters<Scene['run']>[1]) {
  const input = page.getByLabel('Repository or organization link');
  await input.clear();
  await act.type(input, 'JetBrains');
  await act.click(page.getByRole('button', { name: 'Scan' }));
}

export const title = 'Cluster an organization’s skills from its one scan';
export const notShown = {
  'the last line, the answer of `/api/organization`': 'the stream has nothing on screen; tests/web.test.ts checks each line',
  '`{ error }`, no line': 'the stream has nothing on screen; tests/web.test.ts',
  '`{ error }`, as above': 'the stream has nothing on screen; tests/organization-clusters.test.ts',
  '`GET /api/clusters/progress': 'the stream has nothing on screen, only what the page makes of it; tests/organization-clusters.test.ts',
  '`{ scan }`, the answer': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  '`{ clustering }`': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  '`{ clustered: { skills, of } }`': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  'the answer of `/api/clusters`': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  'no model on the server': 'every scene here has an ask; tests/organization-clusters.test.ts and tests/progress.test.ts',
  'what the page reads for an organization': 'the stream has nothing on screen, only what the page makes of it',
};
export const scenes: Scene[] = [
  {
    caption: 'Scan the organization JetBrains: the totals and its repositories, the Scan button enabled again',
    covers: ['On the right, the totals', 'its repositories shown meanwhile'],
    async run(page, act) {
      await paceClusters(page);
      await scanJetBrains(page, act);
      await expect(page.locator('.summary h2')).toHaveText('JetBrains', { timeout: 15_000 });
      await expect(page.locator('.summary p').first()).toHaveText('7 skills in 3 of 5 repositories.');
      await expect(page.locator('#skills .name')).toHaveText(['JetBrains/idea', 'JetBrains/android', 'JetBrains/kotlin']);
      await expect(page.getByRole('button', { name: 'Scan' })).toBeEnabled();
    },
  },
  {
    caption: 'Its clusters start by themselves: “Clustering 7 skills with haiku…” and a bar of the skills from 0, no button to press',
    covers: ['then, unless there are no skills, its clusters', 'While it runs, under the totals'],
    async run(page) {
      await expect(status(page)).toHaveText('Clustering 7 skills with haiku…');
      await expect(status(page).locator('.spinner')).toBeVisible();
      await expect(skillsBar(page)).toHaveJSProperty('value', 0);
      await expect(skillsBar(page)).toHaveJSProperty('max', 7);
      await expect(button(page)).toBeHidden();
    },
  },
  {
    caption: 'As haiku answers, “Clustered 2 of 7 skills…”, then 6 and 7: the bar moving on, the same spinner',
    covers: ['as the model\'s answer streams', 'the same spinner throughout'],
    async run(page) {
      const spinner = await status(page).locator('.spinner').elementHandle();
      await expect(status(page)).toHaveText('Clustered 2 of 7 skills with haiku…');
      await expect(skillsBar(page)).toHaveJSProperty('value', 2);
      await expect(status(page)).toHaveText('Clustered 6 of 7 skills with haiku…');
      await expect(status(page)).toHaveText('Clustered 7 of 7 skills with haiku…');
      await expect(skillsBar(page)).toHaveJSProperty('value', 7);
      assert(await spinner!.evaluate((node) => node.isConnected), 'the same spinner');
    },
  },
  {
    caption: '7 skills in 3 clusters, from that one scan: the page asked the server once, the organization not scanned again',
    covers: ['Once the organization is scanned', 'Under the totals, `N skills in K clusters.`', 'its skills by **name**'],
    async run(page, act) {
      const read: string[] = [];
      page.on('request', (request) => new URL(request.url()).pathname.startsWith('/api/') && read.push(new URL(request.url()).pathname));
      await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
      await expect(page.locator('#clusters .theme h3')).toHaveText(['Build3 skills', 'Docs3 skills', 'Review1 skill']);
      await expect(page.locator('#clusters .theme').first().locator('li')).toHaveText([
        'buildJetBrains/kotlinRun the build.',
        'lintJetBrains/androidRun the lint.',
        'releaseJetBrains/kotlinRun the release.',
      ]);
      await act.pause(500);
      assert(read.length === 0, `no request after the scan's own: ${read.join(', ')}`);
    },
  },
  {
    caption: 'Scan it again, claude not logged in: the clear message under the totals, and Cluster skills to try again',
    covers: ['A failure → the clear message', 'No `claude`, an error from it'],
    async run(page, act) {
      await scanJetBrains(page, act);
      await expect(page.locator('#clusters .error')).toHaveText('claude could not cluster the skills: Not logged in · Please run /login', {
        timeout: 15_000,
      });
      await expect(button(page)).toBeEnabled();
    },
  },
  {
    caption: 'Cluster skills: the organization scanned again, “Listing JetBrains’s repositories…”, the button disabled',
    covers: ['while it runs, under the button', 'the button disabled'],
    async run(page, act) {
      await act.click(button(page));
      await expect(status(page)).toHaveText('Listing JetBrains’s repositories…');
      await expect(button(page, 'Clustering…')).toBeDisabled();
    },
  },
  {
    caption: 'Its progress, as the organization’s own scan shows it: “Scanned 3 of 5 repositories” and the bar',
    covers: ['as the organization\'s own scan shows them'],
    async run(page) {
      await expect(status(page)).toHaveText('Scanned 3 of 5 repositories');
      await expect(status(page).locator('progress')).toHaveJSProperty('value', 3);
      await expect(status(page).locator('progress')).toHaveJSProperty('max', 5);
    },
  },
  {
    caption: 'Then haiku: “Clustering 7 skills with haiku…”, the skills’ bar in the repositories’ bar’s place',
    covers: ['then `Clustering N skills with haiku…` and the skills'],
    async run(page) {
      await expect(status(page)).toHaveText('Clustering 7 skills with haiku…', { timeout: 10_000 });
      await expect(skillsBar(page)).toHaveJSProperty('max', 7);
      await expect(status(page).locator('progress')).toHaveCount(1);
    },
  },
  {
    caption: 'The clusters come: the Cluster skills button hidden again',
    covers: ['the clusters come → the button hidden again'],
    async run(page) {
      await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.', { timeout: 10_000 });
      await expect(button(page)).toBeHidden();
      await expect(button(page, 'Clustering…')).toBeHidden();
    },
  },
  {
    caption: 'Scan it again, then Skill Atlas while haiku clusters: home, the answer dropped',
    covers: ['drops the answer, and stops the model'],
    async run(page, act) {
      await page.unroute('**/api/clusters/progress?*');
      await scanJetBrains(page, act);
      await expect(status(page)).toHaveText('Clustering 7 skills with haiku…');
      await act.click(page.getByRole('link', { name: 'Skill Atlas' }));
      await act.pause(3000);
      await expect(page.locator('#skills')).toHaveText('Paste a repository or an organization and press Scan.');
      await expect(page.locator('#detail')).toBeEmpty();
    },
  },
];

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
