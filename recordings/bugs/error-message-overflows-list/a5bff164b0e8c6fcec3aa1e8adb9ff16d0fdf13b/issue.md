Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. Paste a GitHub link to a SKILL.md deep in a repository
3. Scan: the list says it is not a repository link
4. The message should wrap in the list: no sideways scroll

## Expected

`spec/web.md`, the page: "Fits the window, at any width …: no sideways scroll; … a long word wrapped". The error, "Not a GitHub repository URL: <link>", should wrap inside the list; `.message` has no `overflow-wrap`, so the link stays on one line and `#skills` scrolls sideways.

## Actual

```
expect(received).toBeLessThanOrEqual(expected)

Expected: <= 0
Received:    539

Call Log:
- Timeout 5000ms exceeded while waiting on the predicate
```

It fails at step 4 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/error-message-overflows-list/steps.ts`, with the steps file above.
