Found by the red agent at `efaef30`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. A 375 px window, and code-style with a copy at a long path
3. The SKILL.md should fit the window: no sideways scroll

## Expected

`spec/web.md`, the page: "Fits the window, at any width, a phone's 375 px too: no sideways scroll; … a long name, description or path cut with …, a long word wrapped". The copy's path in `.copies code` neither wraps nor is cut, so `#detail` gets wider than the window.

## Actual

```
expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0
Received:    416

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/copies-path-overflows-narrow/steps.ts`, with the steps file above.
