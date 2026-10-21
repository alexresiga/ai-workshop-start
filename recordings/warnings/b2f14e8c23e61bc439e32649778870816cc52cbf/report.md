### Recording: Hide the warnings by default, at `b2f14e8`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `55a4b27`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:15` | The warnings, under the header, **hidden by default**: a `⚠ N warnings` button shows them, and hides them again | example/fixture has a warning: hidden, only a ⚠ 1 warning button under the header (0:00.9)<br>Click it: the warning shows; click again: hidden (0:02.8) |
| `spec/web.md:15` | a new scan, or home, hides them | Shown, then home: nothing under the header; Back scans again, and the warning is hidden (0:06.7) |
| `spec/web.md:16` | the clustering's warnings change the count, not whether they are shown | Cluster: the model’s warning, hidden; show it, cluster again: ⚠ 2 warnings, still shown (0:14.1) |
| `spec/web.md:16` | none → nothing under the header | Scan JetBrains, no warnings: nothing under the header (0:09.9) |

**Before**, at `55a4b27`: fails at scene 1, "example/fixture has a warning: hidden, only a ⚠ 1 warning button under the header": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (5 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 18.8 s, 469 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 18.8 s, 470 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.8 s, 221 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4, 5) · ✓ dark frames are the page (SSIM ≥ 0.986) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4, 5) · ✓ a second run is the same (starts ±0.04 s, SSIM ≥ 0.995)
