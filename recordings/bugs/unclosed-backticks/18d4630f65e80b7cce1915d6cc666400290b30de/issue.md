Found by the red agent at `18d4630`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md says "Wrap code in ``` fences; use `x` inline."
3. Only `x` should be code: the "```" is text, and so is " fences; use "

## Expected

`spec/web.md`, the SKILL.md: "the body, rendered Markdown: … code …", "as on GitHub". On GitHub (CommonMark's code spans) a run of backticks with no closing run of the same length is text: "```" stays as typed, and only `x` is code

## Actual

```
expect(locator).toHaveText(expected) failed

Locator: locator('#detail .markdown p code')
Timeout: 5000ms
- Expected  - 1
+ Received  + 1

  Array [
-   "x",
+   "fences; use",
  ]
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/unclosed-backticks/steps.ts`, with the steps file above.
