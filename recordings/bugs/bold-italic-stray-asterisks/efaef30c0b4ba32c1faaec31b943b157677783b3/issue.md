Found by the red agent at `efaef30`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md says "***Never*** commit tabs."
3. It should read "Never commit tabs.", no stars left

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … emphasis". `***Never***` is strong and emphasised, as on GitHub: the paragraph reads "Never commit tabs.", with no `*` left.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Never commit tabs."
Received: "*Never* commit tabs."
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/bold-italic-stray-asterisks/steps.ts`, with the steps file above.
