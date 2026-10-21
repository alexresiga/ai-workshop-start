Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: a paragraph whose second line starts "2024."
3. It should be one paragraph, "2024." in it, and no list

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: headings, paragraphs, lists, …", as on GitHub. In GitHub Markdown only a list starting at 1 can interrupt a paragraph, so "The format changed in\n2024. Use the new one." is one paragraph; `markdown.js` ends the paragraph at "2024." and starts a list, so "2024." disappears.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p').first()
Expected: "The format changed in 2024. Use the new one."
Received: "The format changed in"
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/ordered-list-interrupts-paragraph/steps.ts`, with the steps file above.
