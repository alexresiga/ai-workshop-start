### Recording: A link to a path with a space: Read [the guide](<docs/my guide.md>)., at `c6d691f`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `e47857d`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:60` | A link's destination may be in `<…>`, as on GitHub (CommonMark's link destinations): then it may hold spaces and parentheses, not a line break, `<` nor `>` | In <…>, parentheses need no partner: "[the draft](<docs/my guide (draft.md>)" is a link too (0:03.0) |
| `spec/web.md:61` | "Read [the guide](<docs/my guide.md>)." is "Read the guide.", "the guide" a link to `docs/my%20guide.md` next to the SKILL.md | code-style's SKILL.md says "Read [the guide](<docs/my guide.md>).": "the guide" links docs/my%20guide.md next to it (0:01.0) |
| `spec/web.md:62` | a `<` with no `>`, `[the guide](<docs/my guide.md)`, is text | Now "[the guide](<docs/my guide.md)", with no closing >: it stays text, as on GitHub (0:05.0) |

**Before**, at `e47857d`: fails at scene 1, "code-style's SKILL.md says "Read [the guide](<docs/my guide.md>).": "the guide" links docs/my%20guide.md next to it": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.3 s, 183 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.2 s, 179 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.5 s, 212 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.17 s, SSIM ≥ 0.996)
