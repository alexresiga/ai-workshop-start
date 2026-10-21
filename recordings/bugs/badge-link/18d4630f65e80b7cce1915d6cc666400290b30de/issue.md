Found by the red agent at `18d4630`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md has a badge: [![build](https://ci.example.com/badge.svg)](https://ci.example.com)
3. It should be one link, with no link inside it

## Expected

`spec/web.md`, the SKILL.md: "a link holds no other link", as on GitHub, where the badge is one link, to https://ci.example.com. Here its image becomes a link inside that one: a click on "build" opens badge.svg

## Actual

```
expect(locator).toHaveCount(expected) failed

Locator:  locator('#detail .markdown a')
Expected: 1
Received: 2
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/badge-link/steps.ts`, with the steps file above.
