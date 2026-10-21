### Recording: An escaped star is a plain star, at `2e84759`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `2e84759`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:40` | a code span binds tighter than emphasis, struck-out text and a link's text, as on GitHub: ``**Pass `**kwargs` through**`` is "Pass **kwargs through" in bold, its `**kwargs` as code | "Pass `**kwargs` through" in ** **: still all of it bold, **kwargs as code (0:03.9) |
| `spec/web.md:42` | an escaped `\*`, `\_` or `\~` is a plain character, and never opens or ends emphasis, strong or struck-out text, as on GitHub: `Use *\*.kt* files` is "Use *.kt files", "*.kt" in italics | "Use *\*.kt* files": "*.kt" in italics, its star kept, no backslash, no stray star (0:00.9) |

**Before**, at `2e84759`: fails at scene 1, ""Use *\*.kt* files": "*.kt" in italics, its star kept, no backslash, no stray star": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.0 s, 176 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.0 s, 175 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 210 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.08 s, SSIM ≥ 0.996)
