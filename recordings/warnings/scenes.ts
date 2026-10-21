// The warnings hidden by default (#33), against spec/web.md. The page opens on example/fixture, scanned: release-checklist's
// malformed front matter is its one warning. JetBrains, as the tests answer it (tests/helpers.ts), has none: 7 skills, numbered
// by name: 1 a, 2 b, 3 build, 4 c, 5 lint, 6 release, 7 review.
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const toggle = (page: Page) => page.locator('#warnings-toggle');
const list = (page: Page) => page.locator('#warnings');

let asked = 0;
/** The model, in turn, for each run: first release (6) and review (7) left out, one warning; then build (3) twice too, two warnings. */
export async function ask(): Promise<string> {
  const build = asked++ % 2 ? [3, 5, 3] : [3, 5];
  return JSON.stringify({ clusters: [{ theme: 'Build', skills: build }, { theme: 'Docs', skills: [1, 2, 4] }] });
}

/** Only the button, collapsed: the warnings there, not shown. */
async function expectCollapsed(page: Page, text: string) {
  await expect(toggle(page)).toHaveText(text);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(list(page)).toBeHidden();
}

export const title = 'Hide the warnings by default';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'example/fixture has a warning: hidden, only a ⚠ 1 warning button under the header',
    covers: ['**hidden by default**'],
    async run(page, act) {
      await act.pause();
      await expectCollapsed(page, '⚠ 1 warning');
    },
  },
  {
    caption: 'Click it: the warning shows; click again: hidden',
    covers: ['button shows them, and hides them again'],
    async run(page, act) {
      await act.click(toggle(page));
      await expect(list(page).locator('li')).toHaveText([/^warning: \.agents\/skills\/release-checklist\/SKILL\.md: malformed front matter/]);
      await expect(list(page)).toBeVisible();
      await act.pause();
      await act.click(toggle(page));
      await expectCollapsed(page, '⚠ 1 warning');
    },
  },
  {
    caption: 'Shown, then home: nothing under the header; Back scans again, and the warning is hidden',
    covers: ['a new scan, or home, hides them'],
    async run(page, act) {
      await act.click(toggle(page));
      await expect(list(page)).toBeVisible();
      await act.click(page.getByRole('link', { name: 'Skill Atlas' }));
      await expect(page.locator('#notices')).toBeHidden();
      await page.goBack();
      await expect(page.locator('#count')).toHaveText('3 skills');
      await expectCollapsed(page, '⚠ 1 warning');
    },
  },
  {
    caption: 'Scan JetBrains, no warnings: nothing under the header',
    covers: ['none → nothing under the header'],
    async run(page, act) {
      await page.getByLabel('Repository or organization link').fill('');
      await act.type(page.getByLabel('Repository or organization link'), 'JetBrains');
      await act.press('Enter');
      await expect(page.locator('#count')).toHaveText('7 skills');
      await expect(page.locator('#notices')).toBeHidden();
    },
  },
  {
    caption: 'Cluster: the model’s warning, hidden; show it, cluster again: ⚠ 2 warnings, still shown',
    covers: ['the clustering\'s warnings change the count'],
    async run(page, act) {
      await act.click(page.getByRole('button', { name: 'Cluster skills', exact: true }));
      await expect(page.locator('#clusters > p')).toHaveText('7 skills in 3 clusters.');
      await expectCollapsed(page, '⚠ 1 warning');
      await act.click(toggle(page));
      await act.click(page.getByRole('button', { name: 'Cluster skills', exact: true }));
      await expect(toggle(page)).toHaveText('⚠ 2 warnings');
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
      await expect(list(page).locator('li')).toHaveCount(2);
      await expect(list(page)).toBeVisible();
    },
  },
];
