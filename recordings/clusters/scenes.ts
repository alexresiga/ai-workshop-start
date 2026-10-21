// The skills in clusters by the words their names share (#22), against spec/web.md. The page opens on example/fixture:
// code-style, commits, release-checklist share no word. The fixture has no shared word, and the other recordings count on
// its 3 skills, so example/build is answered here, through the page's own /api/scan, with these names. By hand:
// build is in 3 names: build-cache, build-docs, gradle-build → build · 3, first.
// Left: commits, gradle-bump, java-lint, java-test, kotlin-lint, kotlin-test. gradle is now in 1 name; java, kotlin, lint
// and test in 2 each: java, first in the alphabet → java · 2. Left: kotlin 2, lint 1, test 1 → kotlin · 2.
// Left: commits, gradle-bump → Other · 2, last.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const NAMES: Record<string, string> = {
  'build-cache': 'Clean the build cache.',
  'build-docs': 'Build the documentation site.',
  commits: 'Write commit messages the way this repository does.',
  'gradle-build': 'Run the Gradle build with the usual flags.',
  'gradle-bump': 'Bump the Gradle wrapper version.',
  'java-lint': 'Check Java code with the linter.',
  'java-test': 'Run the Java tests.',
  'kotlin-lint': 'Check Kotlin code with the linter.',
  'kotlin-test': 'Run the Kotlin tests.',
};
const COMMIT = '0123456789abcdef0123456789abcdef01234567';
const BUILD = {
  repository: { id: 'example/build', url: 'https://github.com/example/build', commit: COMMIT },
  skills: Object.entries(NAMES).map(([name, description]) => {
    const path = `.agents/skills/${name}/SKILL.md`;
    const body = `# ${name}\n\n${description}`;
    return {
      name, description, path, link: `https://github.com/example/build/blob/${COMMIT}/${path}`, copies: [],
      text: `---\nname: ${name}\ndescription: ${description}\n---\n${body}\n`, properties: {}, body,
    };
  }),
  warnings: [],
};

const input = (page: Page) => page.getByLabel('Repository or organization link');
const filter = (page: Page) => page.getByLabel('Filter skills');
const headings = (page: Page) => page.locator('#skills .cluster:visible h2');
const cluster = (page: Page, name: string) => page.getByRole('group', { name }).locator('.name');
const shown = (page: Page) => page.locator('#skills button:visible .name');
const selected = (page: Page) => page.locator('#skills button[aria-current="true"] .name');

export const title = 'Cluster the skills by shared words';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'example/fixture: code-style, commits, release-checklist share no word, so the plain list, no heading',
    covers: ['no word shared → the plain list'],
    async run(page, act) {
      await act.pause();
      await expect(shown(page)).toHaveText(['code-style', 'commits', 'release-checklist']);
      await expect(page.locator('#skills h2')).toHaveCount(0);
    },
  },
  {
    caption: 'Scan example/build: a heading over each cluster, build · 3, java · 2, kotlin · 2, Other · 2, each by name',
    covers: ['Each cluster under a heading'],
    async run(page, act) {
      await page.route('**/api/scan?url=example%2Fbuild', (route) => route.fulfill({ json: BUILD }));
      await input(page).fill('');
      await act.type(input(page), 'example/build');
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(page.locator('#count')).toHaveText('9 skills');
      await expect(headings(page)).toHaveText(['build · 3', 'java · 2', 'kotlin · 2', 'Other · 2']);
      await expect(cluster(page, 'kotlin')).toHaveText(['kotlin-lint', 'kotlin-test']);
    },
  },
  {
    caption: 'build is in the most names, so it is first, with every skill that has it: gradle-build too',
    covers: ['the word the most skills share'],
    async run(page, act) {
      await act.pause();
      await expect(cluster(page, 'build')).toHaveText(['build-cache', 'build-docs', 'gradle-build']);
    },
  },
  {
    caption: 'gradle-build is taken: of the skills left, only gradle-bump has gradle, so gradle is no cluster',
    covers: ['then the same among the skills left'],
    async run(page, act) {
      await act.click(page.locator('#skills button', { hasText: 'gradle-bump' }));
      await expect(page.getByRole('group', { name: 'gradle' })).toHaveCount(0);
      await expect(selected(page)).toHaveText('gradle-bump');
    },
  },
  {
    caption: 'java, kotlin, lint and test are each in 2 names: java, first in the alphabet, takes java-lint and java-test',
    covers: ['a tie → the word first in the alphabet'],
    async run(page, act) {
      await act.pause();
      await expect(cluster(page, 'java')).toHaveText(['java-lint', 'java-test']);
      await expect(page.getByRole('group', { name: 'lint' })).toHaveCount(0);
      await expect(page.getByRole('group', { name: 'test' })).toHaveCount(0);
    },
  },
  {
    caption: 'commits and gradle-bump share no word left: Other, last',
    covers: ['the skills left → **Other**, last'],
    async run(page, act) {
      await act.pause();
      await expect(headings(page).last()).toHaveText('Other · 2');
      await expect(cluster(page, 'Other')).toHaveText(['commits', 'gradle-bump']);
    },
  },
  {
    caption: '↑ and ↓ move across the clusters: from build-docs, ↓ to gradle-build, ↓ to java-lint, ↑ back',
    covers: ['move across them'],
    async run(page, act) {
      await act.click(page.locator('#skills button', { hasText: 'build-docs' }));
      await act.press('ArrowDown');
      await expect(selected(page)).toHaveText('gradle-build');
      await act.press('ArrowDown');
      await expect(selected(page)).toHaveText('java-lint');
      await act.press('ArrowUp');
      await expect(selected(page)).toHaveText('gradle-build');
    },
  },
  {
    caption: 'Filter "test": only java-test and kotlin-test are left, so only java · 2 and kotlin · 2 show',
    covers: ['the filter hides a cluster'],
    async run(page, act) {
      await act.type(filter(page), 'test');
      await expect(shown(page)).toHaveText(['java-test', 'kotlin-test']);
      await expect(headings(page)).toHaveText(['java · 2', 'kotlin · 2']);
      await expect(page.locator('#count')).toHaveText('2 of 9 skills');
    },
  },
];
