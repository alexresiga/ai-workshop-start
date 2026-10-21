Found by the red agent at `03fdcd3`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "Tag the release.\", then "Push the tag." on the next line
3. It should be two lines, with no backslash

## Expected

`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … paragraphs", as on GitHub, where a backslash at the end of a line is a hard line break (CommonMark, "Hard line breaks"): "Tag the release.\" then "Push the tag." are two lines of one paragraph, no backslash; `markdown.js` joins them with a space and keeps the `\`.

## Actual

```
expect(locator).not.toContainText(expected) failed

Locator: locator('#detail .markdown p')
Expected substring: not "\\"
Received string: "Tag the release.\\ Push the tag."
Timeout: 5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/backslash-line-break/steps.ts`, with the steps file above.
