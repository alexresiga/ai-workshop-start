### Recording: A long link in an error message wraps in the list, at `40bc1b0`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:45` | a long name, description or path cut with …, a long word wrapped, a link in a message in the list too | Scan a link to a SKILL.md deep in a repository: the error wraps in the list, no sideways scroll (0:01.0) |
| `spec/web.md:45` | a code block or a table wider than the window scrolls in its own box, the words in its cells whole | *not shown*: unchanged, on the same line of the spec; recordings/layout and tests/layout.test.ts show it |

**Before**, at `a5bff16`: fails at scene 1, "Scan a link to a SKILL.md deep in a repository: the error wraps in the list, no sideways scroll": expect(received).toBeLessThanOrEqual(expected)

**Checks**: ✓ every scene's expect, light and dark (1 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 5.7 s, 142 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 5.6 s, 141 frames) · ✓ ffprobe before-light.mp4 (1280×720, 10.0 s, 249 frames) · ✓ light frames are the page (SSIM ≥ 0.993) · ✓ light screenshots match baseline/ (written: 1) · ✓ dark frames are the page (SSIM ≥ 0.990) · ✓ dark screenshots match baseline/ (written: 1) · ✓ a second run is the same (starts ±0.04 s, SSIM ≥ 0.998)
