### Recording: A fence indented under a list item takes that indentation off: "npm test", not "  npm test", at `803bdd7`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `803bdd7`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:40` | a fence takes its own indentation off its lines, as on GitHub (CommonMark's fenced code blocks): "- Run the tests:", then a fence indented 4 spaces with "    npm test", is the code `npm test` in the item | "- Run the tests:", then a fence indented 4 spaces with "npm test": the code is "npm test", as in the fence below it (0:01.0) |
| `spec/web.md:41` | a line indented less keeps what is left | A fence indented 3 spaces: "a" loses its 3, "b", indented less, its 2, "c" has none; "d", indented 5, keeps 2 (0:03.0) |

**Before**, at `803bdd7`: fails at scene 1, ""- Run the tests:", then a fence indented 4 spaces with "npm test": the code is "npm test", as in the fence below it": expect(locator).toHaveJSProperty(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 5.2 s, 130 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 5.3 s, 132 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 210 frames) · ✓ light frames are the page (SSIM ≥ 0.987) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.06 s, SSIM ≥ 0.995)
