Found by the red agent at `a5bff16`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's description: "İzmir team's review rules"
3. Type "review" in the filter
4. The highlight should be on "review", not "eview "

## Expected

`spec/web.md`, the filter: "what each of its words matches is highlighted in the names and descriptions shown, every place it is". Typing "review" should mark "review" in "İzmir team's review rules"; `marks()` in `list.js` finds it in `text.toLowerCase()`, where "İ" becomes two characters, and marks one character too far on.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator: locator('#skills .description mark')
Timeout: 5000ms
- Expected  - 1
+ Received  + 1

  Array [
-   "review",
+   "eview ",
  ]
```

It fails at step 4 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/highlight-shifted-after-dotted-i/steps.ts`, with the steps file above.
