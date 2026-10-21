### Recording: A code span inside bold stays whole, at `08eb923`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:40` | a table may follow a line of text with no blank line, as on GitHub | A table right after a line of text, no blank line between: still a table (0:03.9) |
| `spec/web.md:40` | a code span binds tighter than emphasis, struck-out text and a link's text, as on GitHub: ``**Pass `**kwargs` through**`` is "Pass **kwargs through" in bold, its `**kwargs` as code | "Pass `**kwargs` through" in ** **: all of it bold, **kwargs as code, its asterisks kept (0:00.9) |

**Before**, at `a5bff16`: fails at scene 1, ""Pass `**kwargs` through" in ** **: all of it bold, **kwargs as code, its asterisks kept": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.0 s, 176 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 6.9 s, 173 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 209 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.07 s, SSIM ≥ 0.996)
