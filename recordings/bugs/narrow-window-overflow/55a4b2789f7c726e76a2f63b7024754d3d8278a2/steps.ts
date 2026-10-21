import { expect } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

export const title = 'On a narrow window (375 px) the skills and the SKILL.md overflow it: the page scrolls sideways';
export const expected =
  'A broken layout (overflow): below 50rem the page stacks the list above the SKILL.md, so both should fit the window; ' +
  'at 375 px the page is 375 px wide, and the filter and each skill end inside it';
export const steps: Step[] = [
  {
    caption: 'Narrow the window to a phone’s 375 px: the header fits',
    async run(page, act) {
      await page.setViewportSize({ width: 375, height: 720 });
      await act.pause(800);
      await expect(page.locator('#scan')).toBeInViewport({ ratio: 1 });
    },
  },
  {
    caption: 'The filter and the skills should fit the window too, with no sideways scroll',
    async run(page, act) {
      await act.pause(400);
      await expect(page.getByLabel('Filter skills')).toBeInViewport({ ratio: 1 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    },
  },
];
