---
name: red-agent
description: Use when asked to break, attack, bug-hunt or QA this repo's web view, and to file what breaks as issues, one per bug, with steps and a video, labelled "delegated to AI".
---

# Red agent

Break the web view (`./skill-atlas serve`), then file **one issue per bug**, each with its steps and a video, labelled
`delegated to AI`, so the issue-to-pr automation fixes it. The video is **evidence that the bug exists**: its last step
ends on a Playwright `expect` of what `spec/` promises, and that `expect` fails, in both runs. Contract: [spec/red-agent.md](../../../spec/red-agent.md).

## What a bug is

- The page disagrees with [spec/web.md](../../../spec/web.md), which is the source of truth. Quote the clause.
- Also, with no clause needed: a crash, an uncaught error or a console error, a blank or stuck page, broken layout
  (overlap, overflow, unreadable in dark), or repository text rendered as HTML.
- These are not bugs: a matter of taste, something the spec leaves open, or a GitHub rate limit or outage.

## Steps

1. **Read** `spec/web.md` and `src/page.ts`, `src/list.js`, `src/filter.js`, `src/cluster.js`, `src/markdown.js`.
   Run `gh issue list --repo alexresiga/ai-workshop-start --state open` so you know what is already filed.
2. **Break it.** Run `./skill-atlas serve` and drive it with Playwright (`chromium.launch()`), or record a candidate
   straight away (step 3). Go clause by clause, and try:
   - inputs: empty, spaces, `owner/repo/`, a GitHub link with `tree/…`, `./dir`, an organization, unicode, a huge string;
   - the keyboard: ↑ ↓ at the ends, Esc, Enter; the filter with several words, the same word twice, regex characters;
   - order and timing: Scan twice quickly, the dice during a scan, Back and Forward, a reload on `?repo=` or `?org=`;
   - dark mode, a narrow window, long names and descriptions, Markdown edge cases (tables, nested lists, links, HTML);
   - the server: `GET /api/scan` with no `url`, a bad port, a foreign `Host`.

   Live repositories (`JetBrains/kotlin`, an organization) are allowed while you look, with `GITHUB_TOKEN` if it is set.
3. **Write the steps** for each bug in `recordings/bugs/<slug>/steps.ts`. That folder is ignored: the steps go out
   with the issue. The page opens on `example/fixture` (from `fixture/`: `code-style`, `commits`, `release-checklist`,
   and a warning), already scanned, as in [record-feature](../record-feature/SKILL.md). Use one step per action, and keep
   them as short as the bug allows. The **last** step ends on an `expect` of the right behaviour, so it fails while the bug is there.
4. **Record**: `node .agents/skills/red-agent/repro.ts recordings/bugs/<slug>/steps.ts`. Exit 0 means it failed at the
   last step in 2 of 2 runs. Exit 1 says why there is no video: every step passes (no bug, or the wrong `expect`), an
   earlier step fails (fix the steps), or the steps are flaky (wait for what they need). Then look at `out/preview.gif`
   or a frame (`ffmpeg -ss <s> -i out/repro.mp4 -frames:v 1 f.png`): it must show the bug.
5. **File it**: `bash .agents/skills/red-agent/file.sh --dry-run recordings/bugs/<slug>`, then without `--dry-run`.
   The second argument is a footer: put your signature there if an automation runs you. `file.sh` exits 1 with the URL
   when an open issue has the same title. Add a comment there if you have something new, and don't file it again.

**At most 5 issues per run**, the most severe first: each one starts an issue-to-pr run.

A bug that only shows on a live repository cannot be recorded on the fixture. File it by hand, with
`gh issue create --label "delegated to AI"`, giving the repository, the steps, the expected and actual behaviour, and
"no video: needs <repo>".

## A steps file

```ts
import { expect } from '@playwright/test';
import type { Step } from '../../../.agents/skills/red-agent/repro.ts';

export const title = 'Esc in the filter leaves the pill at "1 of 3 skills"';
export const expected = '`spec/web.md`, the filter: "Esc clears it"; the pill shows `3 skills` again';
export const steps: Step[] = [
  {
    caption: 'Type "messages" in the filter: 1 of 3 skills',
    async run(page, act) {
      await act.type(page.getByLabel('Filter skills'), 'messages');
      await expect(page.locator('#count')).toHaveText('1 of 3 skills');
    },
  },
  {
    caption: 'Press Esc: the pill should say 3 skills',
    async run(page, act) {
      await act.press('Escape');
      await expect(page.locator('#count')).toHaveText('3 skills');
    },
  },
];
```

`act.click`, `act.type`, `act.press` and `act.pause` work as in record-feature. To start elsewhere, call
`page.goto(new URL('/?org=…', page.url()).href)`.

## Common mistakes

| Mistake | Instead |
| --- | --- |
| One issue for several bugs | One issue per bug, so each fix is its own PR |
| An `expect` of what the page does now | An `expect` of what the spec says; the step fails while the bug is there |
| Expected values computed with the code under test | Values from the spec, worked out by hand for the fixture |
| A `timeout` so short the step fails anyway | Let the right state have time to show; the repro must also pass once fixed |
| Filing without `file.sh` | `file.sh`: it publishes the video, checks for duplicates and adds the label |
| Fixing the bug | Only file it; the issue-to-pr automation fixes it |
