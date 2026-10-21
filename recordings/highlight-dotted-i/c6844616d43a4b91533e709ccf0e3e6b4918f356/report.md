### Recording: Highlight the letters matched after an "İ", at `c684461`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:36` | While the filter has text, what each of its words matches is **highlighted** in the names and descriptions shown, every place it is | code-style's description starts with "İ", a capital I with a dot: "İzmir team's review rules" (0:01.0)<br>Add "i": it matches part of "İ", so all of "İ" is highlighted, and every other "i" (0:06.0) |
| `spec/web.md:37` | on the letters matched, even after one that grows in lower case ("İ" → "i̇") | Type "review": the highlight is on "review", not one letter too far on (0:03.0) |
| `spec/web.md:37` | a match of part of one such letter → all of it | Add "i": it matches part of "İ", so all of "İ" is highlighted, and every other "i" (0:06.0) |

**Before**, at `a5bff16`: fails at scene 2, "Type "review": the highlight is on "review", not one letter too far on": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 10.2 s, 254 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 10.1 s, 253 frames) · ✓ ffprobe before-light.mp4 (1280×720, 12.0 s, 301 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.09 s, SSIM ≥ 0.995)
