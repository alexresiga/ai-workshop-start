### Recording: A task list: - [ ] Tag the release, - [x] Write the notes, at `6147a6d`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `03fdcd3`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:46` | A list item that starts with `[ ]` or `[x]` (or `[X]`), then a space and text, is a task list item, as on GitHub (GFM's task list items): a checkbox, unticked or ticked, that a click does not change, then the text alone, no bullet: "- [ ] Tag the release" is an unticked box and "Tag the release" | code-style's SKILL.md says "- [ ] Tag the release", "- [x] Write the notes": a box, unticked then ticked, and the text alone (0:00.9) |
| `spec/web.md:48` | in a loose list, the box is in the item's first paragraph | A loose list, a blank line between its items: each box is in its item's paragraph (0:03.0) |
| `spec/web.md:48` | `[ ]` with no text after it, `[y]`, `[x]text` or an escaped `\[ ]` is text | "- [ ]" alone, "- [y] Ship", "- [x]Ship" and "- \[ ] Ship" are text: no box (0:05.0) |

**Before**, at `03fdcd3`: fails at scene 1, "code-style's SKILL.md says "- [ ] Tag the release", "- [x] Write the notes": a box, unticked then ticked, and the text alone": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.2 s, 180 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.2 s, 180 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 211 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.987) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.13 s, SSIM ≥ 0.996)
