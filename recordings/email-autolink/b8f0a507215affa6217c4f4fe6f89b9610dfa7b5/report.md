### Recording: An email autolink is a mailto link: Ask <kotlin-team@example.com>., at `b8f0a50`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `03fdcd3`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:49` | An email autolink is a mailto link, as on GitHub (CommonMark's autolinks): "Ask <kotlin-team@example.com>." is "Ask kotlin-team@example.com.", the address a link to `mailto:kotlin-team@example.com` | code-style's SKILL.md says "Ask <kotlin-team@example.com>.": no brackets, the address a mailto link (0:00.9) |
| `spec/web.md:50` | one that is not an address, `<a b@c.d>`, is text | Now "Ask <a b@c.d>.": with a space it is not an address, so it stays text, brackets and all (0:03.0) |

**Before**, at `03fdcd3`: fails at scene 1, "code-style's SKILL.md says "Ask <kotlin-team@example.com>.": no brackets, the address a mailto link": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 5.2 s, 130 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 5.2 s, 129 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 209 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2) · ✓ a second run is the same (starts ±0.09 s, SSIM ≥ 0.995)
