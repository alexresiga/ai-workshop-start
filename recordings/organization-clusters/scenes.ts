// Cluster an organization's skills (#23), against spec/web.md, on JetBrains as the tests answer it (tests/helpers.ts): 7 skills
// in 3 of 5 repositories, numbered by name: 1 a, 2 b, 3 build, 4 c, 5 lint, 6 release, 7 review. The web view's own
// /api/clusters/progress runs as it is; a small server of the scene's own passes its lines on at a reading pace, so each
// step of the progress stays on screen.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';
// The web view's own error, as claude.ts throws it: a clear message, not an unexpected one.
import { AtlasError } from '../../src/core/errors.ts';

const button = (page: Page, name = 'Cluster skills') => page.getByRole('button', { name, exact: true });
const status = (page: Page) => page.locator('#clusters #clustering');

let asked = 0;
/**
 * The model, in turn, for each run: the clusters; then not logged in; then the clusters again, a moment later, which home
 * drops. The clusters: Docs (a, b, c) before Build (build, lint), build (3) twice, 9 not in the list, release (6) and
 * review (7) left out.
 */
export async function ask(): Promise<string> {
  const turn = asked++ % 3;
  if (turn === 1) throw new AtlasError('claude could not cluster the skills: Not logged in · Please run /login');
  // The one home drops: slow enough for home to come first.
  if (turn === 2) await new Promise((done) => setTimeout(done, 2500));
  return JSON.stringify({ clusters: [{ theme: 'Build', skills: [3, 5, 3, 9] }, { theme: 'Docs', skills: [1, 2, 4] }] });
}

/** How long before each line goes on: the first, so the listing shows; each repository; the model; the answer. */
const pace = (line: { progress?: unknown; clustering?: unknown }, first: boolean) =>
  first ? 1500 : line.progress ? 1200 : line.clustering !== undefined ? 1200 : 2200;

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

async function paceClusters(page: Page) {
  const url = await paced();
  await page.unroute('**/api/clusters/progress?*');
  await page.route('**/api/clusters/progress?*', (route) => route.continue({ url: `${url}?url=${encodeURIComponent(route.request().url())}` }));
}

export const title = 'Cluster an organization’s skills';
export const notShown = {
  'the scenes file': 'where the answer comes from has nothing on screen: here it is always this file’s ask',
  'none → the question fails': 'every scene here has an ask; a recording without one is a scenes file that does not cluster',
  'The model: **haiku**': 'the server’s claude -p has nothing on screen; tests/organization-clusters.test.ts checks its arguments',
  '**No tools**': 'the model’s tools have nothing on screen; tests/organization-clusters.test.ts checks its arguments and directory',
  'in an empty directory of its own': 'the server’s process has nothing on screen; tests/organization-clusters.test.ts checks its directory',
  'More than **5 minutes**': 'the server’s process has nothing on screen; tests/organization-clusters.test.ts stops a slow claude',
  'the page closed or reloaded while it runs': 'the server’s process has nothing on screen; tests/organization-clusters.test.ts checks it is stopped',
  '`CLAUDE`, optional': 'the server’s environment has nothing on screen; tests/organization-clusters.test.ts runs a fake claude',
  'The question, on stdin': 'the question has nothing on screen; tests/organization-clusters.test.ts checks each line',
  'share a number': 'the question has nothing on screen; tests/organization-clusters.test.ts checks it',
  'the answer asked for as JSON': 'the model’s raw answer has nothing on screen; tests/organization-clusters.test.ts reads it fenced too',
  '`GET /api/clusters?': 'the JSON API has nothing on screen; tests/organization-clusters.test.ts',
  'not an organization, or a failure → status 400': 'the JSON API has nothing on screen; tests/organization-clusters.test.ts',
  '`GET /api/clusters/progress': 'the stream has nothing on screen, only what the page makes of it; tests/organization-clusters.test.ts',
  'as the organization is scanned again': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  '`{ clustering }`': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  'the answer of `/api/clusters`': 'the stream has nothing on screen; tests/organization-clusters.test.ts checks each line',
  'not an organization → status 400, `{ error }`': 'the stream has nothing on screen; tests/organization-clusters.test.ts',
  'what the page reads': 'the stream has nothing on screen, only what the page makes of it',
};
export const scenes: Scene[] = [
  {
    caption: 'Scan the organization JetBrains: the totals, then a Cluster skills button',
    covers: ['`JetBrains` as the tests', 'On the right, the totals', 'then a **Cluster skills** button'],
    async run(page, act) {
      const input = page.getByLabel('Repository or organization link');
      await input.clear();
      await act.type(input, 'JetBrains');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(page.locator('.summary h2')).toHaveText('JetBrains');
      await expect(page.locator('.summary p').first()).toHaveText('7 skills in 3 of 5 repositories.');
      await expect(button(page)).toBeEnabled();
    },
  },
  {
    caption: 'Cluster skills: the organization scanned again, “Listing JetBrains’s repositories…”, the button disabled',
    covers: ['**Cluster skills**: the organization scanned again', 'while it runs, under the button', 'the button disabled'],
    async run(page, act) {
      await paceClusters(page);
      await act.click(button(page));
      await expect(status(page)).toHaveText('Listing JetBrains’s repositories…');
      await expect(button(page, 'Clustering…')).toBeDisabled();
    },
  },
  {
    caption: 'Its progress, as the organization’s own scan shows it: “Scanned 3 of 5 repositories” and the bar',
    covers: ['then `Scanned N of M repositories`'],
    async run(page) {
      await expect(status(page)).toHaveText('Scanned 3 of 5 repositories');
      await expect(status(page).locator('progress')).toHaveJSProperty('value', 3);
      await expect(status(page).locator('progress')).toHaveJSProperty('max', 5);
    },
  },
  {
    caption: 'Then haiku: “Clustering 7 skills with haiku…”',
    covers: ['then `Clustering N skills with haiku…`'],
    async run(page) {
      await expect(status(page)).toHaveText('Clustering 7 skills with haiku…');
      await expect(status(page).locator('progress')).toHaveCount(0);
    },
  },
  {
    caption: '7 skills in 3 clusters: Docs, Build, then Other; each with its pill',
    covers: ['Under the button, `N skills in K clusters.`', 'The clusters with most skills', 'one the model leaves out → `Other`'],
    async run(page) {
      await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
      await expect(page.locator('#clusters .theme h3')).toHaveText(['Docs3 skills', 'Build2 skills', 'Other2 skills']);
    },
  },
  {
    caption: 'Each skill: its name, linked to its SKILL.md, its repository and its first sentence',
    covers: ['its skills by **name**'],
    async run(page, act) {
      await act.click(page.locator('#clusters .theme li').first().locator('.in'));
      await expect(page.locator('#clusters .theme').first().locator('li')).toHaveText([
        'aJetBrains/ideaRun the a.',
        'bJetBrains/ideaRun the b.',
        'cJetBrains/ideaRun the c.',
      ]);
      const link = page.getByRole('link', { name: 'a', exact: true });
      await expect(link).toHaveAttribute('href', 'https://github.com/JetBrains/idea/blob/main/.agents/skills/a/SKILL.md');
    },
  },
  {
    caption: 'Under the header, a warning for each kind: not in the list, twice, left out',
    covers: ['one it names twice', 'a number not in the list', 'each kind a *warning*'],
    async run(page) {
      await expect(page.locator('#warnings li')).toHaveText([
        'warning: the model named numbers not in the list: 9; ignored',
        'warning: the model named build more than once; kept in the first cluster',
        'warning: the model left out release, review; in Other',
      ]);
    },
  },
  {
    caption: 'Cluster skills again, claude not logged in: the clear message, under the button',
    covers: ['No `claude`, an error from it'],
    async run(page, act) {
      await act.click(button(page));
      await expect(page.locator('#clusters .error')).toHaveText('claude could not cluster the skills: Not logged in · Please run /login', {
        timeout: 15_000,
      });
      await expect(button(page)).toBeEnabled();
    },
  },
  {
    caption: 'Cluster skills, then Skill Atlas before the answer: home, and the answer is dropped',
    covers: ['a new scan, or home, drops the answer'],
    async run(page, act) {
      await page.unroute('**/api/clusters/progress?*');
      await act.click(button(page));
      await act.click(page.getByRole('link', { name: 'Skill Atlas' }));
      await act.pause(3000);
      await expect(page.locator('#skills')).toHaveText('Paste a repository or an organization and press Scan.');
      await expect(page.locator('#detail')).toBeEmpty();
    },
  },
];
