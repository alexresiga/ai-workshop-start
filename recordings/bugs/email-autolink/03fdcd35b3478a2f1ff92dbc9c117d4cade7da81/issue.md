Found by the red agent at `03fdcd3`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. code-style's SKILL.md: "Ask <kotlin-team@example.com>."
3. It should read "Ask kotlin-team@example.com.", the address a mailto link

## Expected

`spec/web.md`, the SKILL.md: "the body, **rendered Markdown**: … links … only http, https and mailto links", as on GitHub, where `<kotlin-team@example.com>` is an email autolink (CommonMark, "Autolinks"): "Ask kotlin-team@example.com.", the address a link to `mailto:kotlin-team@example.com`; `markdown.js` reads `<https://…>` autolinks only, and leaves this one as text.

## Actual

```
expect(locator).toHaveText(expected) failed

Locator:  locator('#detail .markdown p')
Expected: "Ask kotlin-team@example.com."
Received: "Ask <kotlin-team@example.com>."
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/email-autolink/steps.ts`, with the steps file above.
