Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "**Pass `**kwargs` through**"
3. It should read "Pass **kwargs through", in bold, **kwargs as code

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … code, … emphasis", as on GitHub, where a code span binds tighter than emphasis. "**Pass `**kwargs` through**" is "Pass **kwargs through" in bold, with `**kwargs` as code; `markdown.js` closes the bold at the `**` inside the backticks.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Pass **kwargs through"
Received: "Pass `kwargs` through**"
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/code-span-in-bold/steps.ts`, with the steps file above.
