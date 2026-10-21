### Recording: A long path in a warning wraps on a phone, at `5abdd0b`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `03fdcd3`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:53` | a long name, description or path cut with …, a long word wrapped, in a warning too | At a phone's 375 px, the warning names a skill deep in a repository: the path wraps, no sideways scroll (0:01.0) |
| `spec/web.md:53` | a code block or a table wider than the window scrolls in its own box, the words in its cells whole | *not shown*: the fixture has no code block or table wider than a phone; tests/layout.test.ts shows it with one |

**Before**, at `03fdcd3`: fails at scene 1, "At a phone's 375 px, the warning names a skill deep in a repository: the path wraps, no sideways scroll": expect(received).toBe(expected) // Object.is equality

**Checks**: ✓ every scene's expect, light and dark (1 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 6.8 s, 169 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 6.7 s, 167 frames) · ✓ ffprobe before-light.mp4 (1280×720, 10.2 s, 255 frames) · ✓ light frames are the page (SSIM ≥ 0.988) · ✓ light screenshots match baseline/ (written: 1) · ✓ dark frames are the page (SSIM ≥ 0.983) · ✓ dark screenshots match baseline/ (written: 1) · ✓ a second run is the same (starts ±0.02 s, SSIM ≥ 0.995)
