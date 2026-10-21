Found by the red agent at `55a4b27`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. Open the JetBrains organization: 7 skills, 3 of 5 repositories
3. Narrow the window to 820 px: the whole pill should still show

## Expected

`spec/web.md`, an organization: "The header: the organization, an `N skills` pill and an `M of N repositories` pill"; at 820 px wide the whole `3 of 5 repositories` pill is on screen, with no sideways scroll (a broken layout otherwise)

## Actual

```
expect(locator).toBeInViewport() failed

Locator:  locator('#repositories')
Expected: in viewport
Received: viewport ratio 0.8784269690513611
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/header-pill-clipped/steps.ts`, with the steps file above.
