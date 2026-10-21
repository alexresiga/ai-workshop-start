### Recording: Cluster an organization’s skills, at `1fdb4ff`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `1fdb4ff`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/record-feature.md:16` | The web view of the recorded commit on a free port, GitHub answering from this checkout's `fixture/` as `example/fixture`, and for `example` as an organization with only that repository | Scan the organization example: the totals, then a Cluster skills button (0:00.9) |
| `spec/record-feature.md:17` | the same for the before and the after: no network, no token | *not shown*: the network and the token have nothing on screen |
| `spec/record-feature.md:18` | The model, for a scene that asks it: the scenes file's `ask(prompt)`, never `claude` | *not shown*: where the answer comes from has nothing on screen: here it is always this file’s ask |
| `spec/record-feature.md:18` | none → the question fails | *not shown*: every scene here has an ask; a recording without one is a scenes file that does not cluster |
| `spec/web.md:30` | On the right, the totals, and `Pick a repository to see its skills.` | Scan the organization example: the totals, then a Cluster skills button (0:00.9) |
| `spec/web.md:30` | then a **Cluster skills** button, unless there are no skills | Scan the organization example: the totals, then a Cluster skills button (0:00.9) |
| `spec/web.md:36` | **Cluster skills**: the organization scanned again, nothing is stored, and its skills grouped by theme by a small model | Cluster skills: “Clustering 3 skills with haiku…”, the button disabled (0:05.2) |
| `spec/web.md:37` | `Clustering N skills with haiku…` while it runs, the button disabled | Cluster skills: “Clustering 3 skills with haiku…”, the button disabled (0:05.2) |
| `spec/web.md:37` | a new scan, or home, drops the answer | Cluster skills, then Skill Atlas before the answer: home, and the answer is dropped (0:18.1) |
| `spec/web.md:38` | Under the button, `N skills in K clusters.`, then each cluster: its theme and an `N skills` pill | 3 skills in 3 clusters: Git, Style, then Other; each with its pill (0:07.4) |
| `spec/web.md:38` | its skills by **name**, each linked to its SKILL.md on GitHub, with its repository and the description's *first sentence* | Each skill: its name, linked to its SKILL.md, its repository and its first sentence (0:10.0) |
| `spec/web.md:40` | The clusters with most skills *first*, then by theme | 3 skills in 3 clusters: Git, Style, then Other; each with its pill (0:07.4) |
| `spec/web.md:41` | **Every skill in exactly one cluster**: one the model leaves out → `Other`, last | 3 skills in 3 clusters: Git, Style, then Other; each with its pill (0:07.4) |
| `spec/web.md:41` | one it names twice → the first cluster | Under the header, after the scan’s warning, one for each kind: not in the list, twice, left out (0:12.2) |
| `spec/web.md:42` | a number not in the list → ignored | Under the header, after the scan’s warning, one for each kind: not in the list, twice, left out (0:12.2) |
| `spec/web.md:42` | each kind a *warning*, naming ten and how many more, under the header after the scan's, until the next answer | Under the header, after the scan’s warning, one for each kind: not in the list, twice, left out (0:12.2) |
| `spec/web.md:44` | The model: **haiku**, through Claude Code on the server: `claude -p --model haiku --output-format json`, no tools, no session kept | *not shown*: the server’s claude -p has nothing on screen; tests/cluster.test.ts checks its arguments |
| `spec/web.md:45` | `CLAUDE`, optional: another `claude` binary | *not shown*: the server’s environment has nothing on screen; tests/cluster.test.ts runs a fake claude |
| `spec/web.md:46` | The question, on stdin: each skill numbered, sorted by name, with its name and its description's first sentence, cut at 160 characters | *not shown*: the question has nothing on screen; tests/cluster.test.ts checks each line |
| `spec/web.md:47` | skills with the same line, a skill copied into many repositories, share a number | *not shown*: the question has nothing on screen; tests/cluster.test.ts checks it |
| `spec/web.md:47` | the answer asked for as JSON, `{"clusters": [{"theme", "skills": [<numbers>]}]}`, read even inside a code fence | *not shown*: the model’s raw answer has nothing on screen; tests/cluster.test.ts reads it fenced too |
| `spec/web.md:49` | No `claude`, an error from it (not logged in, …), or an answer that is not the clusters → the clear message, under the button | Cluster skills again, claude not logged in: the clear message, under the button (0:13.5) |
| `spec/web.md:59` | `GET /api/clusters?name=<org \| org/ \| GitHub URL>` → JSON `{ organization: { id, url }, skills, clusters: [{ theme, skills: [{ name, description, repository, path, link }] }], warnings }`, `skills` the count | *not shown*: the JSON API has nothing on screen; tests/cluster.test.ts |
| `spec/web.md:60` | not an organization, or a failure → status 400, `{ error }` | *not shown*: the JSON API has nothing on screen; tests/cluster.test.ts |

**Before**, at `1fdb4ff`: fails at scene 1, "Scan the organization example: the totals, then a Cluster skills button": expect(locator).toBeEnabled() failed

**Checks**: ✓ every scene's expect, light and dark (7 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 24.6 s, 615 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 24.5 s, 612 frames) · ✓ ffprobe before-light.mp4 (1280×720, 11.5 s, 287 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7) · ✓ dark frames are the page (SSIM ≥ 0.985) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7) · ✓ a second run is the same (starts ±0.12 s, SSIM ≥ 0.996)
