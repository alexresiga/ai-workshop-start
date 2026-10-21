Found by the red agent at `18d4630`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md says "Read [the guide](<docs/my guide.md>)."
3. "the guide" should be a link to docs/my guide.md, next to the SKILL.md

## Expected

`spec/web.md`, the SKILL.md: "links", "Links in the body resolve next to the SKILL.md on GitHub". On GitHub (CommonMark's link destinations) a destination in `<…>` may hold spaces: "the guide" is a link to `docs/my%20guide.md` next to the SKILL.md

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Read the guide."
Received: "Read [the guide](<docs/my guide.md>)."
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/pointy-link/steps.ts`, with the steps file above.
