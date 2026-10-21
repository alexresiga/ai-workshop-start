Found by the red agent at `efaef30`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "Then:", and steps 3. and 4.
3. The list should be numbered from 3, as written

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … lists". `3. Run the tests.` then `4. Commit.` are steps 3 and 4, as on GitHub; the page drops the start number (a list node has no attributes in `markdown.js`), so the steps read 1 and 2.

## Actual

```
expect(locator).toHaveJSProperty(expected) failed

Locator:  locator('#detail .markdown ol')
Expected: 3
Received: 1
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/ordered-list-start-lost/steps.ts`, with the steps file above.
