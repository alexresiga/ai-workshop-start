// Cluster an organization's skills (#23), against spec/web.md. The page opens on example/fixture; `example` is an
// organization with only that repository: code-style, commits, release-checklist, so 3 skills, numbered by name.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';
// The web view's own error, as claude.ts throws it: a clear message, not an unexpected one.
import { AtlasError } from '../../src/core/errors.ts';

const button = (page: Page, name = 'Cluster skills') => page.getByRole('button', { name, exact: true });

let asked = 0;
/**
 * The model, in turn, for each run: clusters after a while, slow enough to see `Clustering…`; then not logged in; then
 * clusters again, which home drops. The clusters: Style before Git, commits (2) twice, 9 not in the list, release-checklist
 * (3) left out.
 */
export async function ask(): Promise<string> {
  const turn = asked++ % 3;
  await new Promise((done) => setTimeout(done, 2500));
  if (turn === 1) throw new AtlasError('claude could not cluster the skills: Not logged in · Please run /login');
  return JSON.stringify({ clusters: [{ theme: 'Style', skills: [1] }, { theme: 'Git', skills: [2, 2, 9] }] });
}

export const title = 'Cluster an organization’s skills';
export const notShown = {
  'the same for the before and the after': 'the network and the token have nothing on screen',
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
  '`GET /api/clusters': 'the JSON API has nothing on screen; tests/organization-clusters.test.ts',
  'not an organization, or a failure → status 400': 'the JSON API has nothing on screen; tests/organization-clusters.test.ts',
};
export const scenes: Scene[] = [
  {
    caption: 'Scan the organization example: the totals, then a Cluster skills button',
    covers: ['and for `example` as an organization', 'On the right, the totals', 'then a **Cluster skills** button'],
    async run(page, act) {
      const input = page.getByLabel('Repository or organization link');
      await input.clear();
      await act.type(input, 'example');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(page.locator('.summary h2')).toHaveText('example');
      await expect(page.locator('.summary p').first()).toHaveText('3 skills in 1 of 1 repository.');
      await expect(button(page)).toBeEnabled();
    },
  },
  {
    caption: 'Cluster skills: “Clustering 3 skills with haiku…”, the button disabled',
    covers: ['**Cluster skills**: the organization scanned again', '`Clustering N skills with haiku…` while it runs'],
    async run(page, act) {
      await act.click(button(page));
      await expect(page.locator('#clusters')).toHaveText('Clustering 3 skills with haiku…');
      await expect(button(page, 'Clustering…')).toBeDisabled();
    },
  },
  {
    caption: '3 skills in 3 clusters: Git, Style, then Other; each with its pill',
    covers: ['Under the button, `N skills in K clusters.`', 'The clusters with most skills', 'one the model leaves out → `Other`'],
    async run(page) {
      await expect(page.locator('#clusters > p')).toHaveText('3 skills in 3 clusters.', { timeout: 5000 });
      await expect(page.locator('#clusters .theme h3')).toHaveText(['Git1 skill', 'Style1 skill', 'Other1 skill']);
    },
  },
  {
    caption: 'Each skill: its name, linked to its SKILL.md, its repository and its first sentence',
    covers: ['its skills by **name**'],
    async run(page, act) {
      const commits = page.getByRole('link', { name: 'commits', exact: true });
      await act.click(page.locator('#clusters .theme li').first().locator('.in'));
      await expect(page.locator('#clusters .theme li')).toHaveText([
        'commitsexample/fixtureWrite commit messages the way this repository does.',
        "code-styleexample/fixtureFollow the project's code style.",
        'release-checklistexample/fixture',
      ]);
      await expect(commits).toHaveAttribute('href', 'https://github.com/example/fixture/blob/main/.claude/skills/commits/SKILL.md');
    },
  },
  {
    caption: 'Under the header, after the scan’s warning, one for each kind: not in the list, twice, left out',
    covers: ['one it names twice', 'a number not in the list', 'each kind a *warning*'],
    async run(page) {
      await expect(page.locator('#warnings li')).toHaveText([
        /^warning: example\/fixture: \.agents\/skills\/release-checklist\/SKILL\.md: malformed front matter: /,
        'warning: the model named numbers not in the list: 9; ignored',
        'warning: the model named commits more than once; kept in the first cluster',
        'warning: the model left out release-checklist; in Other',
      ]);
    },
  },
  {
    caption: 'Cluster skills again, claude not logged in: the clear message, under the button',
    covers: ['No `claude`, an error from it'],
    async run(page, act) {
      await act.click(button(page));
      await expect(page.locator('#clusters .error')).toHaveText('claude could not cluster the skills: Not logged in · Please run /login', {
        timeout: 5000,
      });
      await expect(button(page)).toBeEnabled();
    },
  },
  {
    caption: 'Cluster skills, then Skill Atlas before the answer: home, and the answer is dropped',
    covers: ['a new scan, or home, drops the answer'],
    async run(page, act) {
      await act.click(button(page));
      await act.click(page.getByRole('link', { name: 'Skill Atlas' }));
      await act.pause(2800);
      await expect(page.locator('#skills')).toHaveText('Paste a repository or an organization and press Scan.');
      await expect(page.locator('#detail')).toBeEmpty();
    },
  },
];
