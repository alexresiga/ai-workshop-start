### Recording: Strong inside emphasis: *Always **run** the tests*, at `65c37d6`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:41` | Emphasis may hold strong, as on GitHub: `*Always **run** the tests*` is the words in italics, `run` in bold too, no star left | code-style's SKILL.md says "*Always **run** the tests*": the words in italics, "run" in bold too, no star left (0:01.0) |

**Before**, at `a5bff16`: fails at scene 1, "code-style's SKILL.md says "*Always **run** the tests*": the words in italics, "run" in bold too, no star left": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (1 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 3.3 s, 82 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 3.2 s, 79 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.5 s, 212 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (SSIM ≥ 1.000) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (SSIM ≥ 1.000) · ✓ a second run is the same (starts ±0.04 s, SSIM ≥ 0.996)
