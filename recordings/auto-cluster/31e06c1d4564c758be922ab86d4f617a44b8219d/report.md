### Recording: Cluster an organization’s skills from its one scan, at `31e06c1`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `31e06c1`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/web.md:46` | On the right, the totals, and `Pick a repository to see its skills.` | Scan the organization JetBrains: the totals and its repositories, the Scan button enabled again (0:00.9) |
| `spec/web.md:46` | then, unless there are no skills, its clusters, which start by themselves: [an organization’s clusters](#an-organizations-clusters) | Its clusters start by themselves: “Clustering 7 skills with haiku…”, no button to press (0:11.7) |
| `spec/web.md:53` | Once the organization is scanned, its skills are grouped by theme by a small model, **at once**, from that same scan: the organization is not scanned again | 7 skills in 3 clusters, from that one scan: the page asked the server once, the organization not scanned again (0:13.1) |
| `spec/web.md:54` | its repositories shown meanwhile, the Scan button enabled again | Scan the organization JetBrains: the totals and its repositories, the Scan button enabled again (0:00.9) |
| `spec/web.md:55` | While it runs, under the totals: the spinner and `Clustering N skills with haiku…` | Its clusters start by themselves: “Clustering 7 skills with haiku…”, no button to press (0:11.7) |
| `spec/web.md:55` | a new scan, or home, drops the answer, and stops the model | Scan it again, then Skill Atlas while haiku clusters: home, the answer dropped (0:40.2) |
| `spec/web.md:57` | A failure → the clear message, and a **Cluster skills** button, to try again: nothing is stored, so the organization scanned again | Scan it again, claude not logged in: the clear message under the totals, and Cluster skills to try again (0:15.8) |
| `spec/web.md:58` | while it runs, under the button: the spinner and `Listing <org>’s repositories…`, then `Scanned N of M repositories` and the progress bar, as the organization's own scan shows them | Cluster skills: the organization scanned again, “Listing JetBrains’s repositories…”, the button disabled (0:29.1)<br>Its progress, as the organization’s own scan shows it: “Scanned 3 of 5 repositories” and the bar (0:31.4) |
| `spec/web.md:59` | then `Clustering N skills with haiku…` | Then haiku: “Clustering 7 skills with haiku…” (0:35.0) |
| `spec/web.md:59` | the button disabled | Cluster skills: the organization scanned again, “Listing JetBrains’s repositories…”, the button disabled (0:29.1) |
| `spec/web.md:60` | the clusters come → the button hidden again | The clusters come: the Cluster skills button hidden again (0:38.1) |
| `spec/web.md:61` | Under the totals, `N skills in K clusters.`, then each cluster: its theme and an `N skills` pill | 7 skills in 3 clusters, from that one scan: the page asked the server once, the organization not scanned again (0:13.1) |
| `spec/web.md:61` | its skills by **name**, each linked to its SKILL.md on GitHub, with its repository and the description's *first sentence* | 7 skills in 3 clusters, from that one scan: the page asked the server once, the organization not scanned again (0:13.1) |
| `spec/web.md:76` | No `claude`, an error from it (not logged in, …), or an answer that is not the clusters → the clear message, under the totals | Scan it again, claude not logged in: the clear message under the totals, and Cluster skills to try again (0:15.8) |
| `spec/web.md:87` | the last line, the answer of `/api/organization`, or `{ error }` | *not shown*: the stream has nothing on screen; tests/web.test.ts checks each line |
| `spec/web.md:88` | not an organization → status 400, `{ error }`, no line | *not shown*: the stream has nothing on screen; tests/web.test.ts |
| `spec/web.md:91` | `GET /api/clusters/progress?name=<org \| org/ \| GitHub URL>` → the same, as NDJSON, one JSON a line, as it goes: `{ progress: { scanned, of } }` as the organization is scanned | *not shown*: the stream has nothing on screen, only what the page makes of it; tests/organization-clusters.test.ts |
| `spec/web.md:92` | `{ scan }`, the answer of `/api/organization`, once it is scanned | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:92` | `{ clustering }`, how many skills the model is asked about, unless there are none | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:93` | the last line, the answer of `/api/clusters`, or `{ error }` | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:93` | no model on the server → `{ error }` after `{ scan }` | *not shown*: every scene here has an ask; tests/organization-clusters.test.ts and tests/progress.test.ts |
| `spec/web.md:94` | not an organization → status 400, `{ error }`, as above | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts |
| `spec/web.md:94` | what the page reads for an organization | *not shown*: the stream has nothing on screen, only what the page makes of it |

**Before**, at `31e06c1`: fails at scene 2, "Its clusters start by themselves: “Clustering 7 skills with haiku…”, no button to press": expect(locator).toHaveText(expected) failed

**Checks**: ✓ every scene's expect, light and dark (9 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 50.2 s, 1254 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 49.9 s, 1248 frames) · ✓ ffprobe before-light.mp4 (1280×720, 13.0 s, 326 frames) · ✓ light frames are the page (SSIM ≥ 0.993) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7, 8, 9) · ✓ dark frames are the page (SSIM ≥ 0.991) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7, 8, 9) · ✓ a second run is the same (starts ±0.08 s, SSIM ≥ 0.997)
