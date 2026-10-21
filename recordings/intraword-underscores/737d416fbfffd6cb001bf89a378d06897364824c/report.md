### Recording: Underscores inside a word are not emphasis, at `737d416`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:40` | underscores inside a word, `snake_case` or `my__init__`, are not emphasis, as on GitHub | code-style's SKILL.md: "Call my__init__ first, keep snake_case_names." reads as it is, nothing bold (0:00.9) |

**Before**, at `a5bff16`: fails at scene 1, "code-style's SKILL.md: "Call my__init__ first, keep snake_case_names." reads as it is, nothing bold": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (1 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 3.2 s, 81 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 3.2 s, 79 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 209 frames) · ✓ light frames are the page (SSIM ≥ 0.985) · ✓ light screenshots match baseline/ (written: 1) · ✓ dark frames are the page (SSIM ≥ 0.980) · ✓ dark screenshots match baseline/ (written: 1) · ✓ a second run is the same (starts ±0.03 s, SSIM ≥ 0.993)
