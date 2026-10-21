### Recording: Collapse the clusters by default, at `f2aa5bb`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `31e06c1`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:27` | The clusters **collapsed by default**: the heading is a button, ▸ or ▾ (`aria-expanded`), that shows its skills, and hides them again | Click the heading release · 2: ▾, its skills show; click it again: ▸, hidden (0:05.9) |
| `spec/web.md:28` | after a scan every cluster is collapsed, and the first skill is still selected, on the right | Scan example/build: gradle · 3, release · 2, Other · 1, all collapsed; gradle-bump still selected, on the right (0:01.0) |
| `spec/web.md:28` | ↑ and ↓ move only through the skills of open clusters | Open gradle and Other; from gradle-wrapper, ↓ skips the collapsed release, to commits; ↑ back (0:09.8) |
| `spec/web.md:29` | text typed in the filter opens each cluster with a skill shown | Filter "write": release opens, with release-notes; Other, with commits (0:15.5) |
| `spec/web.md:29` | the dice opens the cluster of the skill it picks | The dice picks release-checklist from JetBrains/kotlin: only its cluster, release, opens (0:24.0) |
| `spec/web.md:30` | a new scan collapses them all again | Scan example/build again: every cluster collapsed again (0:19.1) |
| `spec/web.md:62` | Each cluster **collapsed by default**: its theme and pill are a button, ▸ or ▾ (`aria-expanded`), that shows its skills, and hides them again | The organization example, Cluster skills: Quality and Git, collapsed; a click shows Quality’s skills, another hides them (0:26.2) |
| `spec/web.md:63` | each new answer comes collapsed | Open Git, then Cluster skills again: the new answer comes collapsed (0:33.9) |

**Before**, at `31e06c1`: fails at scene 1, "Scan example/build: gradle · 3, release · 2, Other · 1, all collapsed; gradle-bump still selected, on the right": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (8 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 38.2 s, 956 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 38.0 s, 950 frames) · ✓ ffprobe before-light.mp4 (1280×720, 12.2 s, 305 frames) · ✓ light frames are the page (SSIM ≥ 0.992) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7, 8) · ✓ dark frames are the page (SSIM ≥ 0.991) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7, 8) · ✓ a second run is the same (starts ±0.09 s, SSIM ≥ 0.996)
