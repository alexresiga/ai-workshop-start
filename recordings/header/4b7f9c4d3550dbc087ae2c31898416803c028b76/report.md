### Recording: The header fits the window, at `4b7f9c4`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `31e06c1`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:7` | The header fits the window, at any width: what does not fit on its line goes on the next, and a name too long for a line breaks within it | The page 820 px wide: the organization and its 3 of 5 repositories pill go on the next line (0:01.0) |
| `spec/web.md:8` | never past the right edge nor into a sideways scroll | All of the header is left of the 820 px edge: the whole pill shows, nothing to scroll sideways (0:03.8) |

**Before**, at `31e06c1`: fails at scene 1, "The page 820 px wide: the organization and its 3 of 5 repositories pill go on the next line": expect(received).toBeGreaterThan(expected)

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 5.9 s, 147 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 5.8 s, 145 frames) · ✓ ffprobe before-light.mp4 (1280×720, 4.4 s, 110 frames) · ✓ light frames are the page (SSIM ≥ 0.995) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.992) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.08 s, SSIM ≥ 0.997)
