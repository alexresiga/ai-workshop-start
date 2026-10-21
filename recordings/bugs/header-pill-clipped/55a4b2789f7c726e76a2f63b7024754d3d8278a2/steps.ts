import { expect } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

export const title = 'Just above 50rem wide, an organization’s "3 of 5 repositories" pill is cut off at the header’s right edge';
export const expected =
  '`spec/web.md`, an organization: "The header: the organization, an `N skills` pill and an `M of N repositories` pill"; ' +
  'at 820 px wide the whole `3 of 5 repositories` pill is on screen, with no sideways scroll (a broken layout otherwise)';
export const steps: Step[] = [
  {
    caption: 'Open the JetBrains organization: 7 skills, 3 of 5 repositories',
    async run(page, act) {
      await page.goto(new URL('/?org=JetBrains', page.url()).href);
      await expect(page.locator('#repositories')).toHaveText('3 of 5 repositories');
      await act.pause(600);
    },
  },
  {
    caption: 'Narrow the window to 820 px: the whole pill should still show',
    async run(page, act) {
      await page.setViewportSize({ width: 820, height: 720 });
      await act.pause(800);
      await expect(page.locator('#repositories')).toBeInViewport({ ratio: 1 });
    },
  },
];
