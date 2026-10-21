### Recording: Scanning a GitHub link says Scanning owner/repo…, at `31e06c1`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `31e06c1`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:13` | While a scan runs, in the list: a **spinner** and `Scanning <owner/repo>…`, for a GitHub link too | Paste https://github.com/example/fixture: a spinner and Scanning example/fixture…; the button says Scanning… (0:01.0) |
| `spec/web.md:13` | the button says `Scanning…` | Paste https://github.com/example/fixture: a spinner and Scanning example/fixture…; the button says Scanning… (0:01.0) |
| `spec/web.md:13` | a slower spinner when the system asks for reduced motion | Reduced motion, and the link with .git: Scanning example/fixture…, the spinner three times slower (0:08.2) |

**Before**, at `31e06c1`: fails at scene 1, "Paste https://github.com/example/fixture: a spinner and Scanning example/fixture…; the button says Scanning…": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 17.5 s, 438 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 17.5 s, 437 frames) · ✓ ffprobe before-light.mp4 (1280×720, 14.8 s, 370 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.04 s, SSIM ≥ 0.995)
