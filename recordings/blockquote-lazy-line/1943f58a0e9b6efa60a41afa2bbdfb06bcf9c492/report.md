### Recording: A quote's second line without ">" stays in the quote, at `1943f58`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:40` | a line with no `>` right after a quoted line goes on with the quote's paragraph, as on GitHub: `> Never push to main` then `on a Friday.` is one quote, `Never push to main on a Friday.` | A quote whose second line has no ">": both lines are the quote, "Never push to main on a Friday." (0:00.9) |
| `spec/web.md:41` | a blank line or a new block ends the quote, as does a line after a quote that ends in code | A blank line ends the quote, and so does code: the line after each is a paragraph of its own (0:03.9) |
| `spec/web.md:42` | a quote nested deep renders at once | *not shown*: how long rendering takes has nothing to see on screen; tests/markdown.test.ts times it |

**Before**, at `a5bff16`: fails at scene 1, "A quote whose second line has no ">": both lines are the quote, "Never push to main on a Friday."": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.0 s, 176 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.0 s, 175 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 210 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (SSIM ≥ 1.000) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (SSIM ≥ 1.000) · ✓ a second run is the same (starts ±0.09 s, SSIM ≥ 0.996)
