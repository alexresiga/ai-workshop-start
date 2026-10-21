Found by the red agent at `03fdcd3`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "Replace &lt;version&gt; &amp; tag it."
3. It should read "Replace <version> & tag it."

## Expected

`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … paragraphs", as on GitHub, where an entity reference is its character (CommonMark, "Entity and numeric character references"): "Replace &lt;version&gt; &amp; tag it." reads "Replace <version> & tag it."; `markdown.js` leaves `&lt;`, `&gt;` and `&amp;` in the text. Still text, never HTML.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Replace <version> & tag it."
Received: "Replace &lt;version&gt; &amp; tag it."
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/entities-shown-raw/steps.ts`, with the steps file above.
