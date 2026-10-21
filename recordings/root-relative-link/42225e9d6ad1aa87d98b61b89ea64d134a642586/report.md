### Recording: A link starting with / opens from the repository root, at `42225e9`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `2e84759`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:42` | Links in the body resolve next to the SKILL.md on GitHub | "the notes" → notes.md: next to code-style's SKILL.md, in .github/skills/code-style/ (0:04.8) |
| `spec/web.md:42` | one starting with a single `/`, from the repository's root at the scanned commit, as on GitHub: `/docs/guide.md` is `https://github.com/<owner>/<repo>/blob/<commit>/docs/guide.md` | "the guide" → /docs/guide.md: docs/guide.md in example/fixture, at the scanned commit (0:01.0) |
| `spec/web.md:44` | only http, https and mailto links | A javascript: link is plain text; https and mailto links stay links (0:07.7) |

**Before**, at `2e84759`: fails at scene 1, ""the guide" → /docs/guide.md: docs/guide.md in example/fixture, at the scanned commit": expect(locator).toHaveAttribute(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 10.8 s, 270 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 10.8 s, 271 frames) · ✓ ffprobe before-light.mp4 (1280×720, 9.2 s, 231 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.14 s, SSIM ≥ 0.996)
