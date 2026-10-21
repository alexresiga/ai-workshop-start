Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "Call my__init__ first."
3. It should read "Call my__init__ first.", nothing bold

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … emphasis", as on GitHub. Underscores inside a word are not emphasis: GitHub shows "Call my__init__ first." as it is; `markdown.js` has no `(?<!\w)` before `__` for strong, as it has for `_`, so it makes "init" bold and drops the four underscores.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Call my__init__ first."
Received: "Call myinit first."
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/intraword-underscores-bold/steps.ts`, with the steps file above.
