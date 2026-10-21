Found by the red agent at `03fdcd3`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. A 375 px window; release-checklist's warning names a skill deep in a repository
3. Show the warning
4. It should wrap in the window: no sideways scroll

## Expected

`spec/web.md`, the page: "**Fits the window**, at any width, a phone's 375 px too: no sideways scroll; … a long word wrapped". A warning naming `plugins/kotlinGradlePluginIntegrationTests/src/testData/.claude/skills/releaseChecklist/SKILL.md`, shown with `⚠ 1 warning`, should wrap in the 375 px window; `#warnings li` has no `overflow-wrap`, so the path stays on one line and widens the page.

## Actual

```
expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0
Received:    253

Call Log:
- Timeout 3000ms exceeded while waiting on the predicate
```

It fails at step 4 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/long-warning-overflows-narrow/steps.ts`, with the steps file above.
