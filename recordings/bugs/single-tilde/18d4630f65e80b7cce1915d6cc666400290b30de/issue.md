Found by the red agent at `18d4630`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md says "Use ~old~ new names."
3. "old" should be struck out, its tildes gone

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … struck-out text", "as on GitHub". GitHub (GFM's strikethrough) strikes out text in one or two tildes: "old" struck out, no tilde left

## Actual

```
expect(locator).toHaveText(expected) failed

Locator: locator('#detail .markdown p del')
Expected: "old"
Timeout: 5000ms
Error: element(s) not found
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/single-tilde/steps.ts`, with the steps file above.
