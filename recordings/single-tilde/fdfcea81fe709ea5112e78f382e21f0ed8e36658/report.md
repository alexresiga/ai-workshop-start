### Recording: Struck out in one tilde: Use ~old~ new names., at `fdfcea8`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `803bdd7`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:46` | Text in one tilde or two is struck out, as on GitHub (GFM's strikethrough): "Use ~old~ new names." strikes out "old", no tilde left, as `~~old~~` does | code-style's SKILL.md says "Use ~old~ new names.", then "Use ~~old~~ new names.": "old" struck out each time, no tilde left (0:01.0) |
| `spec/web.md:47` | the closing tildes are as many as the opening ones, else it is text: `~a~~` | "~a~~" and "~~a~": the closing tildes are not as many as the opening ones, so it is text (0:03.0) |
| `spec/web.md:47` | three or more, `~~~a~~~`, a tilde with a space after the opening one or before the closing one, `~ a~`, or an escaped `\~` is text | "~~~a~~~", "~ a~" and "\~a~" are text: three tildes, a space inside, an escaped tilde (0:05.0) |

**Before**, at `803bdd7`: fails at scene 1, "code-style's SKILL.md says "Use ~old~ new names.", then "Use ~~old~~ new names.": "old" struck out each time, no tilde left": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.2 s, 181 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.2 s, 180 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 210 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.12 s, SSIM ≥ 0.997)
