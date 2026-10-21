### Recording: Skill Atlas: an organization’s skills, clustered, at `efaef30`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `efaef30`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |

**Before**: every scene passes: the video shows nothing new

**Checks**: ✓ every scene's expect, light and dark (9 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 28.4 s, 710 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 28.3 s, 708 frames) · ✓ ffprobe before-light.mp4 (1280×720, 28.4 s, 710 frames) · ✓ light frames are the page (SSIM ≥ 0.996) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7, 8, 9) · ✓ dark frames are the page (SSIM ≥ 0.996) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7, 8, 9) · ✓ a second run is the same (starts ±0.03 s, SSIM ≥ 0.998)
