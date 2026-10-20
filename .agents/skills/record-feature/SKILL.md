---
name: record-feature
description: Use when asked to record, film, screencast or demo a feature or PR of this repo's web view, or to show a reviewer a change working on screen, as a video, GIF or before/after.
---

# Record a feature

The video is **evidence that the change does what `spec/` says**. Each scene shows one changed spec clause, and ends on a
Playwright `expect` of what that clause promises. The recorder checks the video. You don't judge it by eye. Contract: [spec/record-feature.md](../../../spec/record-feature.md).

## Steps

1. **List the clauses** the change makes: `node .agents/skills/record-feature/record.ts --clauses [--base <ref>] [--head <ref>]`.
   `--base` defaults to `origin/main` and `--head` to the working tree; for a merged commit, use `--base C^ --head C`.
2. **Write `recordings/<feature>/scenes.ts`**. Use one scene per clause the screen can show. Put the rest in `notShown`, each with the reason the screen can't show it.
3. **Record**: `node .agents/skills/record-feature/record.ts recordings/<feature>/scenes.ts [--base …] [--head …]`.
   Exit 1 lists what failed. A failing `expect` at the head is a bug in the feature or in the scene. Find out which. Don't loosen the `expect`.
4. **Look at it yourself**: read `out/preview.gif` or a frame (`ffmpeg -ss <s> -i out/after-light.mp4 -frames:v 1 f.png`). Each caption should match what is on screen.
5. **Commit** `scenes.ts` and `baseline/` on the PR branch (`out/` is ignored). Then publish to the open PR: `bash .agents/skills/record-feature/publish.sh <dir> <PR>`.
   Try `--dry-run` first. The script pushes to the `media` branch and posts through `feedback.sh`. For a merged commit, ask where it goes.

## A scenes file

The page opens on `example/fixture` (from `fixture/`: `code-style`, `commits`, `release-checklist`, and a warning), already scanned.

```ts
import { expect } from '@playwright/test';
import type { Scene } from '../../.agents/skills/record-feature/record.ts';

export const title = 'Filter the skills';
export const notShown = { 'Nothing is stored': 'storage has nothing on screen' };
export const scenes: Scene[] = [
  {
    caption: 'Type "messages": only commits is left, the pill says 1 of 3',
    covers: ['the pill shows'], // a piece of the clause's text, in exactly one clause
    async run(page, act) {
      await act.type(page.getByLabel('Filter skills'), 'messages');
      await expect(page.locator('#count')).toHaveText('1 of 3 skills');
    },
  },
];
```

`act.click`, `act.type`, `act.press` (which shows the key on screen) and `act.pause` keep the action readable. Scenes run in order on one page, so each starts where the last one ended.

## Common mistakes

| Mistake | Instead |
| --- | --- |
| Scenes taken from the commit message or the PR body | Scenes from `--clauses`: the spec is the promise |
| Expected values computed with the code under test (`filter.js`) | Values from the spec, worked out by hand for the fixture |
| A live repository, `GITHUB_TOKEN` | The fixture; the recorder never touches the network |
| `notShown` because a clause is hard to show | Only when the screen cannot show it, such as storage, security or the network |
| A recorder or `out/` outside the repo | `recordings/<feature>/scenes.ts`, so it runs again when the feature changes |
| Drag the video into the PR by hand | `publish.sh`; `gh` cannot upload attachments |
| Re-run with `--update` when a baseline differs | Find out why it changed first: `--update` is for a change you mean |
