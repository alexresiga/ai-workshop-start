Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. A 375 px window, the organization example; one skill named kotlin-multiplatform-gradle-plugin-release
3. Open the Git cluster
4. It should fit the window: no sideways scroll

## Expected

`spec/web.md`, the page: "**Fits the window**, at any width, a phone's 375 px too: no sideways scroll; … a long name, description or path cut with …". A skill named `kotlin-multiplatform-gradle-plugin-release` in its cluster should fit the 375 px window; its row in `.theme li` is `white-space: nowrap`, and only the description can shrink, so the name and the repository push `#detail` wider than the window, and it scrolls sideways.

## Actual

```
expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0
Received:    91

Call Log:
- Timeout 3000ms exceeded while waiting on the predicate
```

It fails at step 4 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/org-cluster-long-name-overflow/steps.ts`, with the steps file above.
