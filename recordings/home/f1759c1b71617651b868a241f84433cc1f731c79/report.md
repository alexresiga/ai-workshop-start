### Recording: Skill Atlas returns home, at `f1759c1`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `64805b6`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:10` | **Skill Atlas** in the header returns home: the page as it first opens, the input empty, no scan | Click Skill Atlas: the page as it first opens, the input empty, no scan (0:03.3) |
| `spec/web.md:10` | the address with no `?repo=` or `?org=`, so Back returns to the scan | Back: the address has ?repo= again, and example/fixture is scanned, 3 skills (0:05.6) |
| `spec/web.md:11` | a scan still running is dropped | Scan, and click Skill Atlas while it runs: the answer comes, and the page stays home (0:09.4) |
| `spec/web.md:11` | Back or Forward to that address returns home too | Forward: home again (0:07.5) |
| `spec/web.md:12` | a click with Ctrl, ⌘, Shift or Alt is the browser's, as on any link: home in a new tab or window, and this one keeps its scan | Ctrl+click Skill Atlas: home opens in a new tab, and this one keeps its scan, 3 skills (0:00.9) |

**Before**, at `64805b6`: fails at scene 1, "Ctrl+click Skill Atlas: home opens in a new tab, and this one keeps its scan, 3 skills": locator.scrollIntoViewIfNeeded: Timeout 5000ms exceeded.

**Checks**: ✓ every scene's expect, light and dark (5 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 16.4 s, 409 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 16.3 s, 407 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.3 s, 207 frames) · ✓ light frames are the page (SSIM ≥ 0.987) · ✓ light screenshots match baseline/ (SSIM ≥ 1.000) · ✓ dark frames are the page (SSIM ≥ 0.985) · ✓ dark screenshots match baseline/ (SSIM ≥ 1.000) · ✓ a second run is the same (starts ±0.02 s, SSIM ≥ 0.994)
