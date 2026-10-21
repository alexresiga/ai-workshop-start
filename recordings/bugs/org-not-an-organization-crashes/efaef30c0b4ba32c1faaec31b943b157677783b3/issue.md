Found by the red agent at `efaef30`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. Open ?org=example/fixture, an address that is not an organization
3. The list should give the clear message, not stay on the start screen

## Expected

`spec/web.md`, an organization: "Unreachable repository or not a GitHub URL → the clear message, in the list"; and no uncaught error. Instead `ORGANIZATION.exec(text)[1]` in `scan()` throws `Cannot read properties of null (reading '1')` and the list keeps saying "Paste a repository or an organization and press Scan."

## Actual

```
expect(locator).toBeVisible() failed

Locator: locator('#skills .message.error')
Expected: visible
Timeout: 5000ms
Error: element(s) not found
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/org-not-an-organization-crashes/steps.ts`, with the steps file above.
