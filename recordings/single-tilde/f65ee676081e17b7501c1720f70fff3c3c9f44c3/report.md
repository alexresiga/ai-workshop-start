### Recording: Struck out in one tilde: Use ~old~ new names., at `f65ee67`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `803bdd7`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:46` | Text in one tilde or two is struck out, as on GitHub (GFM's strikethrough): "Use ~old~ new names." strikes out "old", no tilde left, as `~~old~~` does | code-style's SKILL.md says "Use ~old~ new names.", then "Use ~~old~~ new names.": "old" struck out each time, no tilde left (0:01.0) |
| `spec/web.md:47` | the closing tildes are as many as the opening ones, else it is text: `~a~~` | "~a~~" and "~~a~": the closing tildes are not as many as the opening ones, so it is text (0:03.0) |
| `spec/web.md:47` | three or more, `~~~a~~~`, a tilde with a space after the opening one or before the closing one, `~ a~`, or an escaped `\~` is text | "~~~a~~~", "~ a~" and "\~a~" are text: three tildes, a space inside, an escaped tilde (0:05.0) |
| `spec/web.md:48` | as in GFM, a tilde before punctuation opens only after a space or punctuation, and one after punctuation closes only before them | "~/bin and ~/lib" is text: a tilde after punctuation, before a letter, closes nothing; "~(a)~" is struck out (0:07.0) |
| `spec/web.md:49` | a tilde in an autolink `<…>`, a link's destination or a bare URL opens and closes nothing: in "Install to ~/bin, see [docs](https://example.edu/~jdoe/)." no text is struck out, and the link goes to `https://example.edu/~jdoe/` | "Install to ~/bin, see [docs](https://example.edu/~jdoe/).": nothing struck out, the link goes to ~jdoe (0:09.0) |

**Before**, at `803bdd7`: fails at scene 1, "code-style's SKILL.md says "Use ~old~ new names.", then "Use ~~old~~ new names.": "old" struck out each time, no tilde left": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (5 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 11.3 s, 282 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 11.1 s, 278 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.5 s, 212 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (SSIM ≥ 1.000, written: 4, 5) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (SSIM ≥ 1.000, written: 4, 5) · ✓ a second run is the same (starts ±0.21 s, SSIM ≥ 0.996)
