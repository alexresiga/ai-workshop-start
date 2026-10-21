Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "*Always **run** the tests*"
3. It should read "Always run the tests", in italics, "run" in bold, no star

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … emphasis", as on GitHub. "*Always **run** the tests*" is "Always run the tests" in italics, "run" in bold too, no star left; `markdown.js` ends the emphasis at the first `*` of the closing `**`.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Always run the tests"
Received: "Always **run* the tests*"
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/emphasis-around-strong/steps.ts`, with the steps file above.
