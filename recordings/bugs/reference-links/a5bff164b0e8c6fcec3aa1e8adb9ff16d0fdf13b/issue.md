Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "See [the guide][guide]." and "[guide]: https://example.com/guide"
3. It should read "See the guide.", a link to https://example.com/guide, and nothing else

## Expected

`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … links", as on GitHub. "See [the guide][guide]." with `[guide]: https://example.com/guide` below it reads "See the guide.", "the guide" a link to https://example.com/guide, and the definition line is not shown; `markdown.js` knows only inline links, `[text](url)`.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown')
Expected: "See the guide."
Received: "See [the guide][guide].[guide]: https://example.com/guide"
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/reference-links/steps.ts`, with the steps file above.
