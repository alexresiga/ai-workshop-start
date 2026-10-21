### Recording: A long skill name in an organization's cluster fits a phone, at `12e685f`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `a5bff16`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:70` | its skills by **name**, each linked to its SKILL.md on GitHub, with its repository and the description's *first sentence*, on one line | A 375 px window, the organization example, its skill commits named kotlin-multiplatform-gradle-plugin-release; open the Git cluster: one line each (0:01.0) |
| `spec/web.md:71` | a long name, repository or sentence cut with …, so a cluster fits the window, a phone's 375 px too | The long name and its repository cut with …, inside the window: no sideways scroll (0:05.4) |

**Before**, at `a5bff16`: fails at scene 2, "The long name and its repository cut with …, inside the window: no sideways scroll": expect(locator).toHaveCSS(expected) failed

**Checks**: ✓ every scene's expect, light and dark (2 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 9.8 s, 245 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 9.7 s, 243 frames) · ✓ ffprobe before-light.mp4 (1280×720, 13.6 s, 339 frames) · ✓ light frames are the page (SSIM ≥ 0.993) · ✓ light screenshots match baseline/ (SSIM ≥ 1.000) · ✓ dark frames are the page (SSIM ≥ 0.990) · ✓ dark screenshots match baseline/ (SSIM ≥ 1.000) · ✓ a second run is the same (starts ±0.10 s, SSIM ≥ 0.998)
