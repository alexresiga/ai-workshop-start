### Recording: A badge is one link: [![build](https://ci.example.com/badge.svg)](https://ci.example.com), at `d5b0dc3`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `803bdd7`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:42` | a link's text may hold balanced brackets, as on GitHub: "Read [the [beta] guide](https://kotlinlang.org/docs)." is "Read the [beta] guide.", "the [beta] guide" a link | Balanced brackets stay in a link's text: "Read [the [beta] guide](…)." is "Read the [beta] guide." (0:07.1) |
| `spec/web.md:43` | an unbalanced `[` is text, and a link holds no other link: in `[a [b](u) c](v)` only `b` is one | A link in a link's text, "[a [b](b.md) c](c.md)": only "b" is a link (0:05.0) |
| `spec/web.md:44` | an image is a link to it, its text the link's | An image alone, "See ![logo](https://example.com/logo.png).", is a link to it, its text "logo" (0:03.0) |
| `spec/web.md:44` | in a link's text it is that text alone, so a badge is one link, as on GitHub: `[![build](https://ci.example.com/badge.svg)](https://ci.example.com)` is "build", a link to `https://ci.example.com` | code-style's SKILL.md has a badge: it is one link, "build", to the CI, not to badge.svg (0:01.0) |

**Before**, at `803bdd7`: fails at scene 1, "code-style's SKILL.md has a badge: it is one link, "build", to the CI, not to badge.svg": expect(locator).toHaveCount(expected) failed

**Checks**: ✓ every scene's expect, light and dark (4 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 9.4 s, 234 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 9.2 s, 230 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 211 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4) · ✓ a second run is the same (starts ±0.14 s, SSIM ≥ 0.996)
