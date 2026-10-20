// The filter of the web view (8ca5a10), against spec/web.md. Expected values worked out by hand from fixture/:
// code-style "Follow the project's code style. Use before committing Kotlin or Java changes."
// commits    "Write commit messages the way this repository does. Use for every commit."
// release-checklist "Steps before a release: tag, notes, announce"
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const filter = (page: Page) => page.getByLabel('Filter skills');
const shown = (page: Page) => page.locator('#skills button:visible .name');
const selected = (page: Page) => page.locator('#skills button[aria-current="true"] .name');

export const title = 'Filter the skills';
export const notShown = {};
export const scenes: Scene[] = [
  {
    caption: 'Type "COMMIT": code-style (committing) and commits are left, in any case, inside a word; the pill says 2 of 3',
    covers: ['anywhere in a word', 'the pill shows'],
    async run(page, act) {
      await act.type(filter(page), 'COMMIT');
      await expect(shown(page)).toHaveText(['code-style', 'commits']);
      await expect(page.locator('#count')).toHaveText('2 of 3 skills');
    },
  },
  {
    caption: '↓ from code-style goes to commits, and stops there: release-checklist is hidden',
    covers: ['↑ and ↓ move through the shown ones'],
    async run(page, act) {
      await act.click(page.locator('#skills button', { hasText: 'code-style' }));
      await act.press('ArrowDown');
      await expect(selected(page)).toHaveText('commits');
      await act.press('ArrowDown');
      await expect(selected(page)).toHaveText('commits');
    },
  },
  {
    caption: 'Add "messages": every word must match, so only commits is left, and it stays selected',
    covers: ['*every word* typed', 'the selected skill stays if it is shown'],
    async run(page, act) {
      await act.type(filter(page), ' messages');
      await expect(filter(page)).toHaveValue('COMMIT messages');
      await expect(shown(page)).toHaveText(['commits']);
      await expect(page.locator('#count')).toHaveText('1 of 3 skills');
      await expect(selected(page)).toHaveText('commits');
    },
  },
  {
    caption: 'Esc clears the filter: all 3 skills are back, commits still selected',
    covers: ['Esc clears it'],
    async run(page, act) {
      await act.press('Escape');
      await expect(filter(page)).toHaveValue('');
      await expect(shown(page)).toHaveText(['code-style', 'commits', 'release-checklist']);
      await expect(page.locator('#count')).toHaveText('3 skills');
      await expect(selected(page)).toHaveText('commits');
    },
  },
  {
    caption: 'Type "kotlin": commits is hidden, so code-style, the first shown, is selected',
    covers: ['else the first shown is selected'],
    async run(page, act) {
      await act.type(filter(page), 'kotlin');
      await expect(shown(page)).toHaveText(['code-style']);
      await expect(selected(page)).toHaveText('code-style');
    },
  },
  {
    caption: 'Add "deploy": no skill matches, the message says so, and the right is empty',
    covers: ['none left → `No skill matches <text>.`'],
    async run(page, act) {
      await act.type(filter(page), ' deploy');
      await expect(shown(page)).toHaveCount(0);
      await expect(page.locator('#unmatched')).toHaveText('No skill matches kotlin deploy.');
      await expect(page.locator('#detail')).toBeEmpty();
    },
  },
  {
    caption: 'Scan again: the filter is empty and all 3 skills are listed',
    covers: ['a new scan empties it'],
    async run(page, act) {
      await act.click(page.getByRole('button', { name: 'Scan' }));
      await expect(page.locator('#count')).toHaveText('3 skills');
      await expect(filter(page)).toHaveValue('');
      await expect(shown(page)).toHaveText(['code-style', 'commits', 'release-checklist']);
    },
  },
];
