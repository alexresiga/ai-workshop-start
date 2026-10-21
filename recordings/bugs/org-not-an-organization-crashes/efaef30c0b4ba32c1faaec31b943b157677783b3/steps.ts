import { expect } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

export const title = 'Opening `?org=example/fixture` throws a TypeError and leaves the page on its start screen';
export const expected =
  '`spec/web.md`, an organization: "Unreachable repository or not a GitHub URL → the clear message, in the list"; and no uncaught error. ' +
  'Instead `ORGANIZATION.exec(text)[1]` in `scan()` throws `Cannot read properties of null (reading \'1\')` and the list keeps saying "Paste a repository or an organization and press Scan."';
export const steps: Step[] = [
  {
    caption: 'Open ?org=example/fixture, an address that is not an organization',
    async run(page, act) {
      await page.goto(new URL('/?org=example/fixture', page.url()).href);
      await expect(page.locator('#url')).toHaveValue('example/fixture');
      await act.pause();
    },
  },
  {
    caption: 'The list should give the clear message, not stay on the start screen',
    async run(page) {
      await expect(page.locator('#skills .message.error')).toBeVisible();
    },
  },
];
