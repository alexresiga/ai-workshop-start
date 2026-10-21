// The clusters collapsed by default (#40), against spec/web.md. The page opens on example/fixture, whose 3 skills share no
// word, so example/build is answered here, through the page's own /api/scan, and JetBrains/kotlin, the dice's repository,
// with the same skills. By hand: gradle is in 3 names → gradle · 3; release in 2 → release · 2; commits → Other · 1.
// The skills in order: gradle-bump, gradle-cache, gradle-wrapper, release-checklist, release-notes, commits.
// The organization example has only example/fixture: 1 code-style, 2 commits, 3 release-checklist, by name.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const NAMES: Record<string, string> = {
  'gradle-wrapper': 'Update the Gradle wrapper.',
  'gradle-bump': 'Bump the Gradle version.',
  'gradle-cache': 'Clean the build cache.',
  'release-notes': 'Write the release notes.',
  'release-checklist': 'Steps before a release.',
  commits: 'Write commit messages.',
};
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const answer = (id: string) => ({
  repository: { id, url: `https://github.com/${id}`, commit: COMMIT },
  skills: Object.entries(NAMES)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, description]) => {
      const path = `.agents/skills/${name}/SKILL.md`;
      const body = `# ${name}\n\n${description}`;
      return {
        name, description, path, link: `https://github.com/${id}/blob/${COMMIT}/${path}`, copies: [],
        text: `---\nname: ${name}\ndescription: ${description}\n---\n${body}\n`, properties: {}, body,
      };
    }),
  warnings: [],
});

/** The model, for the organization example: Quality (code-style, release-checklist), then Git (commits). */
export async function ask(): Promise<string> {
  return JSON.stringify({ clusters: [{ theme: 'Git', skills: [2] }, { theme: 'Quality', skills: [1, 3] }] });
}

const input = (page: Page) => page.getByLabel('Repository or organization link');
const filter = (page: Page) => page.getByLabel('Filter skills');
const toggle = (page: Page, heading: string) => page.locator('#skills .cluster h2 button', { hasText: heading });
const expanded = (page: Page) => page.locator('#skills .cluster h2 button');
const shown = (page: Page) => page.locator('#skills button:visible .name');
const selected = (page: Page) => page.locator('#skills button[aria-current="true"] .name');
const themes = (page: Page) => page.locator('#clusters .theme h3 button');

async function scanBuild(page: Page, act: Parameters<Scene['run']>[1]) {
  await input(page).fill('');
  await act.type(input(page), 'example/build');
  await act.click(page.getByRole('button', { name: 'Scan' }));
  await expect(page.locator('#count')).toHaveText('6 skills');
}

export const title = 'Collapse the clusters by default';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'Scan example/build: gradle · 3, release · 2, Other · 1, all collapsed; gradle-bump still selected, on the right',
    covers: ['after a scan every cluster is collapsed'],
    async run(page, act) {
      await page.route('**/api/scan?url=example%2Fbuild', (route) => route.fulfill({ json: answer('example/build') }));
      await page.route('**/api/scan?url=JetBrains%2Fkotlin', (route) => route.fulfill({ json: answer('JetBrains/kotlin') }));
      await scanBuild(page, act);
      await expect(expanded(page)).toHaveText(['gradle · 3', 'release · 2', 'Other · 1']);
      for (const button of await expanded(page).all()) await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(shown(page)).toHaveCount(0);
      await expect(selected(page)).toHaveText('gradle-bump');
      await expect(page.locator('#detail .path')).toHaveText('.agents/skills/gradle-bump/SKILL.md');
    },
  },
  {
    caption: 'Click the heading release · 2: ▾, its skills show; click it again: ▸, hidden',
    covers: ['The clusters **collapsed by default**'],
    async run(page, act) {
      await act.click(toggle(page, 'release'));
      await expect(toggle(page, 'release')).toHaveAttribute('aria-expanded', 'true');
      await expect(shown(page)).toHaveText(['release-checklist', 'release-notes']);
      await act.pause();
      await act.click(toggle(page, 'release'));
      await expect(toggle(page, 'release')).toHaveAttribute('aria-expanded', 'false');
      await expect(shown(page)).toHaveCount(0);
    },
  },
  {
    caption: 'Open gradle and Other; from gradle-wrapper, ↓ skips the collapsed release, to commits; ↑ back',
    covers: ['↑ and ↓ move only through the skills of open clusters'],
    async run(page, act) {
      await act.click(toggle(page, 'gradle'));
      await act.click(toggle(page, 'Other'));
      await act.click(page.locator('#skills button', { hasText: 'gradle-wrapper' }));
      await act.press('ArrowDown');
      await expect(selected(page)).toHaveText('commits');
      await act.press('ArrowUp');
      await expect(selected(page)).toHaveText('gradle-wrapper');
    },
  },
  {
    caption: 'Filter "write": release opens, with release-notes; Other, with commits',
    covers: ['text typed in the filter opens each cluster'],
    async run(page, act) {
      await act.type(filter(page), 'write');
      await expect(toggle(page, 'release')).toHaveAttribute('aria-expanded', 'true');
      await expect(shown(page)).toHaveText(['release-notes', 'commits']);
      await act.press('Escape');
      await expect(filter(page)).toHaveValue('');
    },
  },
  {
    caption: 'Scan example/build again: every cluster collapsed again',
    covers: ['a new scan collapses them all again'],
    async run(page, act) {
      await scanBuild(page, act);
      for (const button of await expanded(page).all()) await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(shown(page)).toHaveCount(0);
    },
  },
  {
    caption: 'The dice picks release-checklist from JetBrains/kotlin: only its cluster, release, opens',
    covers: ['the dice opens the cluster'],
    async run(page, act) {
      // Math.random at .5: of the 5 skills that are not gradle-bump, the third, release-checklist.
      await page.evaluate(() => (Math.random = () => 0.5));
      await act.click(page.locator('#dice'));
      await expect(page.locator('#repository a')).toHaveText('JetBrains/kotlin');
      await expect(selected(page)).toHaveText('release-checklist');
      await expect(toggle(page, 'release')).toHaveAttribute('aria-expanded', 'true');
      await expect(toggle(page, 'gradle')).toHaveAttribute('aria-expanded', 'false');
      await expect(shown(page)).toHaveText(['release-checklist', 'release-notes']);
    },
  },
  {
    caption: 'The organization example, Cluster skills: Quality and Git, collapsed; a click shows Quality’s skills, another hides them',
    covers: ['Each cluster **collapsed by default**'],
    async run(page, act) {
      await input(page).fill('');
      await act.type(input(page), 'example');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await act.click(page.getByRole('button', { name: 'Cluster skills' }));
      await expect(themes(page)).toHaveText(['Quality2 skills', 'Git1 skill']);
      await expect(page.locator('#clusters .theme li:visible')).toHaveCount(0);
      await act.click(themes(page).first());
      await expect(themes(page).first()).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#clusters .theme li:visible a')).toHaveText(['code-style', 'release-checklist']);
      await act.pause();
      await act.click(themes(page).first());
      await expect(page.locator('#clusters .theme li:visible')).toHaveCount(0);
    },
  },
  {
    caption: 'Open Git, then Cluster skills again: the new answer comes collapsed',
    covers: ['each new answer comes collapsed'],
    async run(page, act) {
      await act.click(themes(page).last());
      await expect(themes(page).last()).toHaveAttribute('aria-expanded', 'true');
      await act.click(page.getByRole('button', { name: 'Cluster skills' }));
      await expect(page.getByRole('button', { name: 'Cluster skills' })).toBeEnabled();
      await expect(themes(page)).toHaveText(['Quality2 skills', 'Git1 skill']);
      await expect(themes(page).last()).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator('#clusters .theme li:visible')).toHaveCount(0);
    },
  },
];
