Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: a quote whose second line has no ">"
3. The quote should hold both lines: "Never push to main on a Friday."

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … quotes …", as on GitHub. A line right after a quoted line, with no blank line between, continues the quote's paragraph (a lazy continuation): "> Never push to main\non a Friday." is one quote, "Never push to main on a Friday."; `markdown.js` ends the quote at the first line.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown blockquote')
Expected: "Never push to main on a Friday."
Received: "Never push to main"
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/blockquote-lazy-line-dropped/steps.ts`, with the steps file above.
