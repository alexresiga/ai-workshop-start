### Recording: A progress bar while haiku clusters the skills, at `4b750cd`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `31e06c1`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:53` | while it runs, under the button: the spinner and `Listing <org>’s repositories…`, then `Scanned N of M repositories` and the progress bar, as the organization's own scan shows them | The organization scanned again, as its own scan shows it: “Scanned 3 of 5 repositories” and the repositories’ bar (0:06.4) |
| `spec/web.md:54` | then `Clustering N skills with haiku…` and a **progress bar** of the skills, in the repositories' bar's place, from 0 | Then haiku: “Clustering 7 skills with haiku…”, and a bar of the skills from 0 in the repositories’ bar’s place (0:10.9) |
| `spec/web.md:55` | as the model's answer streams, `Clustered K of N skills with haiku…`, the bar moving on with each skill it puts in a cluster | The answer so far, “[3, 5”: 3 is whole, 5 may still grow; “Clustered 1 of 7 skills with haiku…” (0:14.5)<br>The answer: 7 skills in 2 clusters, the bar gone, the button enabled again (0:20.8) |
| `spec/web.md:56` | the same spinner throughout | All 7 placed: the bar full, and the same spinner turning since clustering began (0:18.7) |
| `spec/web.md:56` | the button disabled | Scan JetBrains, then Cluster skills: “Listing JetBrains’s repositories…”, the button disabled (0:00.9) |
| `spec/web.md:64` | The model: **haiku**, through Claude Code on the server: `claude -p --model haiku --output-format stream-json --verbose --include-partial-messages`, no session kept | *not shown*: the server’s claude -p has nothing on screen; tests/organization-clusters.test.ts checks its arguments |
| `spec/web.md:65` | the answer, its last `result` line | *not shown*: claude’s raw output has nothing on screen; tests/organization-clusters.test.ts reads it streamed |
| `spec/web.md:65` | `CLAUDE`, optional: another `claude` binary | *not shown*: the server’s environment has nothing on screen; tests/organization-clusters.test.ts runs a fake claude |
| `spec/web.md:66` | How far the model is: each skill number in a `"skills"` list of the answer so far, once it is *whole* (a comma, a space or the `]` after it: `1` may be the start of `12`), counts the skills of its line, once | The answer so far, “[3, 5”: 3 is whole, 5 may still grow; “Clustered 1 of 7 skills with haiku…” (0:14.5) |
| `spec/web.md:67` | a number not in the list, or named again, does not | Then “3, 5, 3, 9, 1, 2] … [7,”: build named again and 9, not in the list, do not count; 5 of 7 (0:16.6) |
| `spec/web.md:91` | `GET /api/clusters/progress?name=<org \| org/ \| GitHub URL>` → the same, as NDJSON, one JSON a line, as it goes: `{ progress: { scanned, of } }` as the organization is scanned again | *not shown*: the stream has nothing on screen, only what the page makes of it; tests/organization-clusters.test.ts |
| `spec/web.md:92` | `{ clustering }`, how many skills the model is asked about, unless there are none | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:93` | `{ clustered: { skills, of } }` each time the model's answer has put more of them in a cluster | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:93` | the last line, the answer of `/api/clusters`, or `{ error }` | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |

**Before**, at `31e06c1`: fails at scene 3, "Then haiku: “Clustering 7 skills with haiku…”, and a bar of the skills from 0 in the repositories’ bar’s place": expect(locator).toHaveJSProperty(expected) failed

**Checks**: ✓ every scene's expect, light and dark (7 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 24.2 s, 604 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 24.2 s, 605 frames) · ✓ ffprobe before-light.mp4 (1280×720, 21.8 s, 546 frames) · ✓ light frames are the page (SSIM ≥ 0.991) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7) · ✓ dark frames are the page (SSIM ≥ 0.989) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7) · ✓ a second run is the same (starts ±0.05 s, SSIM ≥ 0.997)
