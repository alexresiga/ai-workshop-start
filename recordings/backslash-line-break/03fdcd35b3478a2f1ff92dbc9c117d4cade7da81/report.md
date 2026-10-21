### Recording: A line ending in \ is a line break: "Tag the release.\", then "Push the tag.", at `03fdcd3`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `03fdcd3`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:46` | A paragraph's lines are joined with a space, but a `\` or two spaces at the end of a line is a **line break**, as on GitHub (CommonMark's hard line breaks): "Tag the release.\", then "Push the tag." are two lines, no backslash | code-style's SKILL.md says "Tag the release.\", then "Push the tag.": two lines, no backslash (0:00.9)<br>Two spaces at the end of "Tag the release." break the line too; with no \ nor spaces, it is one line (0:03.0) |
| `spec/web.md:47` | at the end of a paragraph or a heading, escaped (`\\`), or in code, the `\` is text | A \ at the end of the paragraph, escaped as \\, or in code is text: "Done.\", "a\ b", `x\ y` (0:05.0) |

**Before**, at `03fdcd3`: fails at scene 1, "code-style's SKILL.md says "Tag the release.\", then "Push the tag.": two lines, no backslash": expect(locator).not.toContainText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.3 s, 182 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.1 s, 178 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 210 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.14 s, SSIM ≥ 0.996)
