Found by the red agent at `55a4b27`, on `example/fixture` (`fixture/`: code-style, commits, release-checklist), as `record-feature` serves it.

![preview]({{media}}/preview.gif)

[Video]({{media}}/repro.mp4) · [steps]({{media}}/steps.ts) · [captions]({{media}}/captions.vtt) · trace: `npx playwright show-trace` on {{media}}/trace.zip

## Steps

1. `./skill-atlas serve`, open `?repo=example/fixture`
2. Narrow the window to a phone’s 375 px: the header fits
3. The filter and the skills should fit the window too, with no sideways scroll

## Expected

A broken layout (overflow): below 50rem the page stacks the list above the SKILL.md, so both should fit the window; at 375 px the page is 375 px wide, and the filter and each skill end inside it

## Actual

```
expect(locator).toBeInViewport() failed

Locator:  getByLabel('Filter skills')
Expected: in viewport
Received: viewport ratio 0.6209039092063904
Timeout:  5000ms
```

It fails at step 3 in 2 of 2 runs: `node .agents/skills/red-agent/repro.ts recordings/bugs/narrow-window-overflow/steps.ts`, with the steps file above.
