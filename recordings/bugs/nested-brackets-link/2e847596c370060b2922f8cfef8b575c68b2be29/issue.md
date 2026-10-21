Found by the red agent at `2e84759`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "Read [the [beta] guide](https://kotlinlang.org/docs)."
3. It should read "Read the [beta] guide.", "the [beta] guide" a link

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … links". As on GitHub, a link's text may hold balanced brackets: "Read [the [beta] guide](https://kotlinlang.org/docs)." is "Read the [beta] guide.", "the [beta] guide" a link to `https://kotlinlang.org/docs`; `markdown.js` stops a link's text at its first `]`, so no link is found and the Markdown shows as it is.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Read the [beta] guide."
Received: "Read [the [beta] guide](https://kotlinlang.org/docs)."
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/nested-brackets-link/steps.ts`, with the steps file above.
