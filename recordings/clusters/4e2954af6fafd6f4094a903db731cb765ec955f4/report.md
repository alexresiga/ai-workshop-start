### Recording: Cluster the skills by shared words, at `4e2954a`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `b45e925`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:14` | On the left, the skills, cluster by cluster: the name, and the description on one line | Scan example/build: a heading over each cluster, build · 3, java · 2, kotlin · 2, Other · 2, each by name (0:02.8) |
| `spec/web.md:14` | the first is selected | Scan example/build: a heading over each cluster, build · 3, java · 2, kotlin · 2, Other · 2, each by name (0:02.8) |
| `spec/web.md:14` | ↑ and ↓ move, across the clusters too | ↑ and ↓ move across the clusters: from build-docs, ↓ to gradle-build, ↓ to java-lint, ↑ back (0:15.6) |
| `spec/web.md:19` | The skills in **clusters**, by the words their *names* share, split at `-`, `_`, `.` and spaces, in any case: the word the most skills share makes the first cluster, with every skill that has it | build is in the most names, so it is first, with every skill that has it: gradle-build too (0:07.7) |
| `spec/web.md:20` | then the same among the skills left, while a word is shared by two of them | gradle-build is taken: of the skills left, only gradle-bump has gradle, so gradle is no cluster (0:09.6) |
| `spec/web.md:21` | a tie → the word first in the alphabet | java, kotlin, lint and test are each in 2 names: java, first in the alphabet, takes java-lint and java-test (0:11.8) |
| `spec/web.md:21` | the skills left → **Other**, last | commits and gradle-bump share no word left: Other, last (0:13.7) |
| `spec/web.md:22` | Each cluster under a heading, `<word> · N`, largest first, its skills by name | Scan example/build: a heading over each cluster, build · 3, java · 2, kotlin · 2, Other · 2, each by name (0:02.8) |
| `spec/web.md:22` | the filter hides a cluster with no skill shown | Filter "test": only java-test and kotlin-test are left, so only java · 2 and kotlin · 2 show (0:20.0) |
| `spec/web.md:23` | no word shared → the plain list, by name, no heading | example/fixture: code-style, commits, release-checklist share no word, so the plain list, no heading (0:00.9) |

**Before**, at `b45e925`: fails at scene 2, "Scan example/build: a heading over each cluster, build · 3, java · 2, kotlin · 2, Other · 2, each by name": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (8 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 24.3 s, 608 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 24.3 s, 608 frames) · ✓ ffprobe before-light.mp4 (1280×720, 14.1 s, 352 frames) · ✓ light frames are the page (SSIM ≥ 0.986) · ✓ light screenshots match baseline/ (SSIM ≥ 0.993) · ✓ dark frames are the page (SSIM ≥ 0.985) · ✓ dark screenshots match baseline/ (SSIM ≥ 0.991) · ✓ a second run is the same (starts ±0.07 s, SSIM ≥ 0.994)
