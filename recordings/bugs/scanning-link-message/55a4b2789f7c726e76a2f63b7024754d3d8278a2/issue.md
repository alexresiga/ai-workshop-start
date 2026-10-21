Found by the red agent at `55a4b27`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. Paste the GitHub link https://github.com/example/fixture
3. Press Scan: the list should say "Scanning example/fixture…"

## Expected

`spec/web.md`, the page: "While a scan runs, in the list: a **spinner** and `Scanning <owner/repo>…`"; for the link `https://github.com/example/fixture` the list says `Scanning example/fixture…`

## Actual

```
expect(locator).toContainText(expected) failed

Locator: locator('#skills')
Expected substring: "Scanning example/fixture…"
Received string:    "Scanning https://github.com/example/fixture…"
Timeout: 3000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/scanning-link-message/steps.ts`, with the steps file above.
