// The nicer skill list (#21), against spec/web.md. Expected values worked out by hand from fixture/:
// code-style        .github/skills/code-style/SKILL.md          "Follow the project's code style. Use before committing Kotlin or Java changes."
// commits           .claude/skills/commits/SKILL.md             "Write commit messages the way this repository does. Use for every commit."
// release-checklist .agents/skills/release-checklist/SKILL.md   no description: its front matter is malformed
import { expect, type Page } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

const row = (page: Page, name: string) => page.locator('#skills button', { has: page.locator('.name', { hasText: new RegExp(`^${name}$`) }) });

export const title = 'A nicer skill list';
export const notShown = {
  'none for a SKILL.md at the root': 'the fixture has no SKILL.md at the root or in a top skills folder; tests/list.test.ts covers it',
  'its path when hovered': 'a hover title is a native tooltip, which the recording does not draw; tests/list.test.ts covers it',
  '`+N copies` pill': 'the fixture has no copies; tests/list.test.ts covers it',
  'their paths when hovered': 'a hover title is a native tooltip, which the recording does not draw; tests/list.test.ts covers it',
};
export const scenes: Scene[] = [
  {
    caption: 'Beside each name, the folder the skill lives in: .github, .claude, .agents',
    covers: ['a **tag** with the folder it lives in'],
    async run(page, act) {
      await act.pause(800);
      await expect(page.locator('#skills .source')).toHaveText(['.github', '.claude', '.agents']);
    },
  },
  {
    caption: 'release-checklist has no description: "No description", in muted italics, and its row has two lines',
    covers: ['`No description`'],
    async run(page, act) {
      await act.click(row(page, 'release-checklist'));
      const description = row(page, 'release-checklist').locator('.description');
      await expect(description).toHaveText('No description');
      await expect(description).toHaveCSS('font-style', 'italic');
    },
  },
  {
    caption: 'Type "commit": it is highlighted every place it matches, in the names and the descriptions',
    covers: ['**highlighted**'],
    async run(page, act) {
      await act.type(page.getByLabel('Filter skills'), 'commit');
      await expect(row(page, 'code-style').locator('mark')).toHaveText(['commit']);
      await expect(row(page, 'commits').locator('.name mark')).toHaveText(['commit']);
      await expect(row(page, 'commits').locator('.description mark')).toHaveText(['commit', 'commit']);
    },
  },
  {
    caption: 'Esc clears the filter, and the highlights with it',
    covers: ['**highlighted**'],
    async run(page, act) {
      await act.press('Escape');
      await expect(page.locator('#skills mark')).toHaveCount(0);
      await expect(page.locator('#skills button:visible')).toHaveCount(3);
    },
  },
];
