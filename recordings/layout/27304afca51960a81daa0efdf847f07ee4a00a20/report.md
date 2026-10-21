### Recording: The page fits the window, at `27304af`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `31e06c1`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:38` | **Fits the window**, at any width, a phone's 375 px too: no sideways scroll | Narrow the window to a phone's 375 px: the header, the filter and each skill fit, no sideways scroll (0:00.9) |
| `spec/web.md:38` | the list beside the SKILL.md, or above it below 50rem | At 375 px the list is above the SKILL.md, the description of commits cut with …; wide, beside it (0:04.4) |
| `spec/web.md:39` | a long name, description or path cut with …, a long word wrapped | At 375 px the list is above the SKILL.md, the description of commits cut with …; wide, beside it (0:04.4) |
| `spec/web.md:39` | a code block or a table wider than the window scrolls in its own box | *not shown*: the fixture has no code block or table wider than a phone; tests/layout.test.ts shows it with one |

**Before**, at `31e06c1`: fails at scene 1, "Narrow the window to a phone's 375 px: the header, the filter and each skill fit, no sideways scroll": expect(locator).toBeInViewport() failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 8.9 s, 223 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 8.9 s, 222 frames) · ✓ ffprobe before-light.mp4 (1280×720, 9.2 s, 229 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.07 s, SSIM ≥ 0.995)
