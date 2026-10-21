Found by the red agent at `efaef30`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md starts "Code style", then a line of =
3. "Code style" should be a heading, with no ===== left

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: headings, …". A line underlined with `=` is a level-1 heading (and with `-`, level 2), as on GitHub; `markdown.js` only knows `#` headings, so the line and its `=====` become one paragraph.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator: locator('#detail .markdown h1')
Expected: "Code style"
Timeout: 5000ms
Error: element(s) not found
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/setext-heading-not-rendered/steps.ts`, with the steps file above.
