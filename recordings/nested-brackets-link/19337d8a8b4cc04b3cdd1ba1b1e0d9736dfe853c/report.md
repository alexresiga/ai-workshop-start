### Recording: A link's text may hold balanced brackets, at `19337d8`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `2e84759`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:40` | a code span binds tighter than emphasis, struck-out text and a link's text, as on GitHub: ``**Pass `**kwargs` through**`` is "Pass **kwargs through" in bold, its `**kwargs` as code | A code span still binds tighter than the link's text: "[the `[beta` guide](…)": its unbalanced [ in code, still a link (0:06.8) |
| `spec/web.md:42` | a link's text may hold balanced brackets, as on GitHub: "Read [the [beta] guide](https://kotlinlang.org/docs)." is "Read the [beta] guide.", "the [beta] guide" a link | "Read [the [beta] guide](…)." is "Read the [beta] guide.", "the [beta] guide" a link (0:01.0) |
| `spec/web.md:43` | an unbalanced `[` is text, and a link holds no other link: in `[a [b](u) c](v)` only `b` is one | An unbalanced [ is text; in [a [b](…) c](…) only b is a link (0:03.9) |

**Before**, at `2e84759`: fails at scene 1, ""Read [the [beta] guide](…)." is "Read the [beta] guide.", "the [beta] guide" a link": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (3 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 9.9 s, 248 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 10.0 s, 250 frames) · ✓ ffprobe before-light.mp4 (1280×720, 8.4 s, 211 frames) · ✓ light frames are the page (SSIM ≥ 0.990) · ✓ light screenshots match baseline/ (written: 1, 2, 3) · ✓ dark frames are the page (SSIM ≥ 0.988) · ✓ dark screenshots match baseline/ (written: 1, 2, 3) · ✓ a second run is the same (starts ±0.08 s, SSIM ≥ 0.996)
