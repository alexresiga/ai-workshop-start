Found by the red agent at `03fdcd3`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "- [ ] Tag the release", "- [x] Write the notes"
3. Each item should be a checkbox, unticked then ticked, and its text alone

## Expected

`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … lists", as on GitHub, where `- [ ] Tag the release` and `- [x] Write the notes` are task list items (GFM, "Task list items"): a checkbox, unticked then ticked, and the text alone; `markdown.js` leaves `[ ]` and `[x]` at the start of each item.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator: locator('#detail .markdown li')
Timeout: 5000ms
- Expected  - 2
+ Received  + 2

  Array [
-   "Tag the release",
-   "Write the notes",
+   "[ ] Tag the release",
+   "[x] Write the notes",
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/task-list-brackets/steps.ts`, with the steps file above.
