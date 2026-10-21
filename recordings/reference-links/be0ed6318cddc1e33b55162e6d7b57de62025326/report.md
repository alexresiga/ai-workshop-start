### Recording: Reference links in a SKILL.md, at `be0ed63`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:41` | Links in the body as on GitHub: `[text](url)`, and reference links, `[text][label]`, `[text][]` or `[text]`, to a `[label]: url` line anywhere in the file, which is not shown | "See [the guide][guide].", "[Docs][]" and "[docs]", with their [label]: url lines: links, the lines not shown (0:00.9) |
| `spec/web.md:42` | a label in any case, its spaces collapsed | "[the guide][The  GUIDE]" matches "[the guide]: …/first", in any case, spaces collapsed; the second line is ignored (0:03.0) |
| `spec/web.md:42` | the first line of a label counts | "[the guide][The  GUIDE]" matches "[the guide]: …/first", in any case, spaces collapsed; the second line is ignored (0:03.0) |
| `spec/web.md:43` | no such line → the text as it is written, brackets and all | "[the guide][nowhere]" has no [nowhere]: line, so it reads as it is written, brackets and all (0:05.0) |

**Before**, at `a5bff16`: fails at scene 1, ""See [the guide][guide].", "[Docs][]" and "[docs]", with their [label]: url lines: links, the lines not shown": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 7.2 s, 181 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 7.2 s, 180 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 210 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.07 s, SSIM ≥ 0.995)
