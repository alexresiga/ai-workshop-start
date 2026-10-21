### Recording: A list after a line of text, as on GitHub, at `c0b2a8a`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:40` | a table may follow a line of text with no blank line, as on GitHub | A line of text, then a list from 1 and a table, with no blank line: each is still a list and a table (0:03.0) |
| `spec/web.md:40` | a list too, but only one with text in its first item and, if numbered, starting at 1: `The format changed in` then `2024. Use the new one.` is one paragraph | A line starting "2024." inside a paragraph: one paragraph, "2024." in it, no list (0:00.9) |

**Before**, at `a5bff16`: fails at scene 1, "A line starting "2024." inside a paragraph: one paragraph, "2024." in it, no list": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 5.2 s, 131 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 5.2 s, 130 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 210 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.13 s, SSIM ≥ 0.996)
