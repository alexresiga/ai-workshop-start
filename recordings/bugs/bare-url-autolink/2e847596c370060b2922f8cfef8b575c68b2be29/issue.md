Found by the red agent at `2e84759`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "See https://kotlinlang.org/docs."
3. The URL should be a link to https://kotlinlang.org/docs

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … links". GitHub links a bare `http://`, `https://` or `www.` URL in a Markdown file (GFM's autolinks), without its trailing punctuation: "See https://kotlinlang.org/docs." has a link to `https://kotlinlang.org/docs`; the page shows the URL as text, so it cannot be clicked.

## Actual

```
expect(locator).toHaveAttribute(expected) failed

Locator: locator('#detail .markdown p a')
Expected: "https://kotlinlang.org/docs"
Timeout: 5000ms
Error: element(s) not found
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/bare-url-autolink/steps.ts`, with the steps file above.
