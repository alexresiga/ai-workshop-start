Found by the red agent at `2e84759`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "Use *\*.kt* files"
3. It should read "Use *.kt files", "*.kt" in italics

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … emphasis", as on GitHub. An escaped `\*` is a plain star and never ends emphasis: "Use *\*.kt* files" is "Use *.kt files", "*.kt" in italics; `markdown.js` ends the emphasis at the `*` of the escape, leaving a backslash in italics and a stray star.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Use *.kt files"
Received: "Use \\.kt* files"
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/escaped-star-emphasis/steps.ts`, with the steps file above.
