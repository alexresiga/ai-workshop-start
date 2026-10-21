Found by the red agent at `18d4630`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "- Run the tests:", a fence indented 4 spaces with "npm test"; then the same fence, not in a list
3. The item's code should be "npm test", as in the fence below it, with no spaces before it

## Expected

`spec/web.md`, the SKILL.md: "lists, code, fenced or indented, as it is", "as on GitHub". On GitHub (CommonMark's fenced code blocks) a fence indented in its item takes that indentation off its lines: the code is `npm test`

## Actual

```
expect(locator).toHaveJSProperty(expected) failed

Locator:  locator('#detail .markdown li pre code')
Expected: "npm test"
Received: "  npm test"
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/list-fence-indent/steps.ts`, with the steps file above.
