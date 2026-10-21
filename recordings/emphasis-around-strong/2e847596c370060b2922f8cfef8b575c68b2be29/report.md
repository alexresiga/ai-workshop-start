### Recording: Strong inside emphasis: *Always **run** the tests*, at `2e84759`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `2e84759`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:42` | Emphasis may hold strong, as on GitHub: `*Always **run** the tests*` is the words in italics, `run` in bold too, no star left | code-style's SKILL.md says "*Always **run** the tests*": the words in italics, "run" in bold too, no star left (0:01.0) |
| `spec/web.md:43` | a star with a space on each side is text in it: `*5 * 60 seconds*` | Now "*5 * 60 seconds*": the star with a space on each side is text, the whole line still in italics (0:03.0) |

**Before**, at `2e84759`: fails at scene 1, "code-style's SKILL.md says "*Always **run** the tests*": the words in italics, "run" in bold too, no star left": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 5.2 s, 131 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 5.2 s, 131 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.5 s, 212 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (SSIM ≥ 1.000) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (SSIM ≥ 1.000) · ✓ a second run is the same (starts ±0.13 s, SSIM ≥ 0.996)
