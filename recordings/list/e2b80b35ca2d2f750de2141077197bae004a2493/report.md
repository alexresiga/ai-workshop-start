### Recording: A nicer skill list, at `e2b80b3`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `1fdb4ff`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:15` | Beside each name, a **tag** with the folder it lives in: the one that holds its `skills` folder (`.claude`, `.agents`, `agent`), else the first | Beside each name, the folder the skill lives in: .github, .claude, .agents (0:00.9) |
| `spec/web.md:16` | none for a SKILL.md at the root or in a top `skills` folder | *not shown*: the fixture has no SKILL.md at the root or in a top skills folder; tests/list.test.ts covers it |
| `spec/web.md:16` | its path when hovered | *not shown*: a hover title is a native tooltip, which the recording does not draw; tests/list.test.ts covers it |
| `spec/web.md:17` | Beside it too, for a skill with copies, a `+N copies` pill | *not shown*: the fixture has no copies; tests/list.test.ts covers it |
| `spec/web.md:17` | their paths when hovered | *not shown*: a hover title is a native tooltip, which the recording does not draw; tests/list.test.ts covers it |
| `spec/web.md:18` | A skill with no description → `No description`, in muted italics, so each row has two lines | release-checklist has no description: "No description", in muted italics, and its row has two lines (0:03.0) |
| `spec/web.md:22` | While the filter has text, what each of its words matches is **highlighted** in the names and descriptions shown, every place it is | Type "commit": it is highlighted every place it matches, in the names and the descriptions (0:05.3)<br>Esc clears the filter, and the highlights with it (0:08.4) |

**Before**, at `1fdb4ff`: fails at scene 1, "Beside each name, the folder the skill lives in: .github, .claude, .agents": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (4 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 11.9 s, 298 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 11.8 s, 296 frames) · ✓ ffprobe before-light.mp4 (1280×720, 9.1 s, 227 frames) · ✓ light frames are the page (SSIM ≥ 0.982) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4) · ✓ dark frames are the page (SSIM ≥ 0.978) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4) · ✓ a second run is the same (starts ±0.06 s, SSIM ≥ 0.993)
