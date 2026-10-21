Found by the red agent at `2e84759`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "See [the guide](/docs/guide.md)."
3. The link should open docs/guide.md in example/fixture, at the scanned commit

## Expected

`spec/web.md`, the SKILL.md: "Links in the body resolve next to the SKILL.md on GitHub". On GitHub, a link starting with `/` in a Markdown file is relative to the repository's root, so `[guide](/docs/guide.md)` in `example/fixture` goes to `https://github.com/example/fixture/blob/<commit>/docs/guide.md`; the page resolves it against `github.com` itself and links to `https://github.com/docs/guide.md`, a 404.

## Actual

```
expect(locator).toHaveAttribute(expected) failed

Locator:  locator('#detail .markdown a')
Expected: "https://github.com/example/fixture/blob/0123456789abcdef0123456789abcdef01234567/docs/guide.md"
Received: "https://github.com/docs/guide.md"
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/root-relative-link/steps.ts`, with the steps file above.
