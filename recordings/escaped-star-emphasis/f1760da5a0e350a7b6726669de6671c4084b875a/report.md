### Recording: An escaped star is a plain star, at `f1760da`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `75c4ec9`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:44` | An escaped `\*`, `\_` or `\~` is a plain character, and never opens or ends emphasis, strong or struck-out text, as on GitHub: `Use *\*.kt* files` is "Use *.kt files", "*.kt" in italics | "Use *\*.kt* files": "*.kt" in italics, its star kept, no backslash, no stray star (0:01.0) |
| `spec/web.md:45` | `_a \_ b_` is "a _ b" in italics | "_a \_ b_": "a _ b" in italics, the escaped underscore kept inside (0:03.9) |

**Before**, at `75c4ec9`: fails at scene 2, ""_a \_ b_": "a _ b" in italics, the escaped underscore kept inside": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.1 s, 177 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.0 s, 174 frames) · ✓ ffprobe before-light.mp4 (1280×720, 11.4 s, 284 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.10 s, SSIM ≥ 0.996)
