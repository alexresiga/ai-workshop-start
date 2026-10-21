### Recording: A bare URL is a link: See https://kotlinlang.org/docs., at `991b638`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `75c4ec9`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:44` | A bare `http://`, `https://` or `www.` URL in the body is a link, as on GitHub (GFM's autolinks): at the start of the text or after a space, `*`, `_`, `~` or `(`, without its trailing punctuation, an unmatched `)` or an `&amp;`: "See https://kotlinlang.org/docs." links `https://kotlinlang.org/docs` | code-style's SKILL.md says "See https://kotlinlang.org/docs.": the URL is a link, its period is not (0:01.0) |
| `spec/web.md:46` | `www.` links to `http://www.` | Now "Read www.kotlinlang.org/docs, then commit": the www. URL links to http://www.kotlinlang.org/docs (0:03.0) |
| `spec/web.md:46` | not in code, nor in a link's text | A URL in code stays code, and one in a link's text is that link's text: one link, to the guide (0:05.0) |

**Before**, at `75c4ec9`: fails at scene 1, "code-style's SKILL.md says "See https://kotlinlang.org/docs.": the URL is a link, its period is not": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.3 s, 182 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.1 s, 178 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 209 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.17 s, SSIM ≥ 0.996)
