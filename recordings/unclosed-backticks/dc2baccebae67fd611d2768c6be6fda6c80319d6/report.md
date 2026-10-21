### Recording: A run of backticks with no closing run is text, at `dc2bacc`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `e47857d`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:42` | a run of backticks with no closing run as long is text, as on GitHub (CommonMark's code spans): "Wrap code in ``` fences; use `x` inline." is "```" as typed and " fences | "Wrap code in ``` fences; use `x` inline.": the ``` as typed, only x is code (0:01.0) |
| `spec/web.md:43` | use " as text, only `x` code | "Wrap code in ``` fences; use `x` inline.": the ``` as typed, only x is code (0:01.0) |

**Before**, at `e47857d`: fails at scene 1, ""Wrap code in ``` fences; use `x` inline.": the ``` as typed, only x is code": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (1 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 4.2 s, 104 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 4.0 s, 101 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.5 s, 212 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1) · ✓ a second run is the same (starts ±0.02 s, SSIM ≥ 0.996)
