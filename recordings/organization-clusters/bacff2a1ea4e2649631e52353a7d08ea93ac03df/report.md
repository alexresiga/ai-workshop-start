### Recording: Cluster an organization’s skills, at `bacff2a`

![preview]({{media}}/preview.gif)

[After, light]({{media}}/after-light.mp4) · [after, dark]({{media}}/after-dark.mp4) · [before, at `512a3b4`]({{media}}/before-light.mp4) · [captions]({{media}}/captions.vtt) · traces: `npx playwright show-trace <trace-…zip>` from {{media}}

| Spec | Clause | Shown in |
| --- | --- | --- |
| `spec/record-feature.md:16` | The web view of the recorded commit on a free port, GitHub answering from this checkout's `fixture/` as `example/fixture`, and for `example` as an organization with only that repository, `JetBrains` as the tests' organization in `tests/helpers.ts` | Scan the organization JetBrains: the totals, then a Cluster skills button (0:00.9) |
| `spec/record-feature.md:19` | The model, for a scene that asks it: the scenes file's `ask(prompt)`, never `claude` | *not shown*: where the answer comes from has nothing on screen: here it is always this file’s ask |
| `spec/record-feature.md:19` | none → the question fails | *not shown*: every scene here has an ask; a recording without one is a scenes file that does not cluster |
| `spec/web.md:45` | On the right, the totals, and `Pick a repository to see its skills.` | Scan the organization JetBrains: the totals, then a Cluster skills button (0:00.9) |
| `spec/web.md:45` | then a **Cluster skills** button, unless there are no skills | Scan the organization JetBrains: the totals, then a Cluster skills button (0:00.9) |
| `spec/web.md:51` | **Cluster skills**: the organization scanned again, nothing is stored, and its skills grouped by theme by a small model | Cluster skills: the organization scanned again, “Listing JetBrains’s repositories…”, the button disabled (0:05.4) |
| `spec/web.md:52` | while it runs, under the button: the spinner and `Listing <org>’s repositories…`, then `Scanned N of M repositories` and the progress bar, as the organization's own scan shows them | Cluster skills: the organization scanned again, “Listing JetBrains’s repositories…”, the button disabled (0:05.4)<br>Its progress, as the organization’s own scan shows it: “Scanned 3 of 5 repositories” and the bar (0:07.7) |
| `spec/web.md:53` | then `Clustering N skills with haiku…` | Then haiku: “Clustering 7 skills with haiku…” (0:12.8) |
| `spec/web.md:53` | the button disabled | Cluster skills: the organization scanned again, “Listing JetBrains’s repositories…”, the button disabled (0:05.4) |
| `spec/web.md:54` | a new scan, or home, drops the answer | Cluster skills, then Skill Atlas before the answer: home, and the answer is dropped (0:35.2) |
| `spec/web.md:55` | Under the button, `N skills in K clusters.`, then each cluster: its theme and an `N skills` pill | 7 skills in 3 clusters: Docs, Build, then Other; each with its pill (0:16.4) |
| `spec/web.md:55` | its skills by **name**, each linked to its SKILL.md on GitHub, with its repository and the description's *first sentence* | Each skill: its name, linked to its SKILL.md, its repository and its first sentence (0:18.4) |
| `spec/web.md:57` | The clusters with most skills *first*, then by theme | 7 skills in 3 clusters: Docs, Build, then Other; each with its pill (0:16.4) |
| `spec/web.md:58` | **Every skill in exactly one cluster**: one the model leaves out → `Other`, last | 7 skills in 3 clusters: Docs, Build, then Other; each with its pill (0:16.4) |
| `spec/web.md:58` | one it names twice → the first cluster | Under the header, a warning for each kind: not in the list, twice, left out (0:20.7) |
| `spec/web.md:59` | a number not in the list → ignored | Under the header, a warning for each kind: not in the list, twice, left out (0:20.7) |
| `spec/web.md:59` | each kind a *warning*, naming ten and how many more, under the header after the scan's, until the next answer | Under the header, a warning for each kind: not in the list, twice, left out (0:20.7) |
| `spec/web.md:61` | The model: **haiku**, through Claude Code on the server: `claude -p --model haiku --output-format json`, no session kept | *not shown*: the server’s claude -p has nothing on screen; tests/organization-clusters.test.ts checks its arguments |
| `spec/web.md:62` | `CLAUDE`, optional: another `claude` binary | *not shown*: the server’s environment has nothing on screen; tests/organization-clusters.test.ts runs a fake claude |
| `spec/web.md:63` | **No tools**, the descriptions being any repository's text: no built-in tool, no MCP server, the operator's own included | *not shown*: the model’s tools have nothing on screen; tests/organization-clusters.test.ts checks its arguments and directory |
| `spec/web.md:63` | in an empty directory of its own, so no project's `CLAUDE.md`, settings or `.mcp.json` | *not shown*: the server’s process has nothing on screen; tests/organization-clusters.test.ts checks its directory |
| `spec/web.md:65` | More than **5 minutes** → stopped, `claude took too long to cluster the skills`, at once, whatever `claude` does: killed if SIGTERM has not stopped it 5 s later | *not shown*: the server’s process has nothing on screen; tests/organization-clusters.test.ts stops a slow claude |
| `spec/web.md:66` | the page closed or reloaded while it runs → stopped | *not shown*: the server’s process has nothing on screen; tests/organization-clusters.test.ts checks it is stopped |
| `spec/web.md:67` | The question, on stdin: each skill numbered, sorted by name, with its name and its description's first sentence, cut at 160 characters | *not shown*: the question has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:68` | skills with the same line, a skill copied into many repositories, share a number | *not shown*: the question has nothing on screen; tests/organization-clusters.test.ts checks it |
| `spec/web.md:68` | the answer asked for as JSON, `{"clusters": [{"theme", "skills": [<numbers>]}]}`, read even inside a code fence | *not shown*: the model’s raw answer has nothing on screen; tests/organization-clusters.test.ts reads it fenced too |
| `spec/web.md:70` | No `claude`, an error from it (not logged in, …), or an answer that is not the clusters → the clear message, under the button | Cluster skills again, claude not logged in: the clear message, under the button (0:22.0) |
| `spec/web.md:83` | `GET /api/clusters?name=<org \| org/ \| GitHub URL>` → JSON `{ organization: { id, url }, skills, clusters: [{ theme, skills: [{ name, description, repository, path, link }] }], warnings }`, `skills` the count | *not shown*: the JSON API has nothing on screen; tests/organization-clusters.test.ts |
| `spec/web.md:84` | not an organization, or a failure → status 400, `{ error }` | *not shown*: the JSON API has nothing on screen; tests/organization-clusters.test.ts |
| `spec/web.md:85` | `GET /api/clusters/progress?name=<org \| org/ \| GitHub URL>` → the same, as NDJSON, one JSON a line, as it goes: `{ progress: { scanned, of } }` as the organization is scanned again | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:86` | `{ clustering }`, how many skills the model is asked about, unless there are none | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:86` | the last line, the answer of `/api/clusters`, or `{ error }` | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts checks each line |
| `spec/web.md:87` | not an organization → status 400, `{ error }` | *not shown*: the stream has nothing on screen; tests/organization-clusters.test.ts |
| `spec/web.md:87` | what the page reads | *not shown*: the stream has nothing on screen, only what the page makes of it |

**Before**, at `512a3b4`: fails at scene 1, "Scan the organization JetBrains: the totals, then a Cluster skills button": expect(locator).toBeEnabled() failed

**Checks**: ✓ every scene's expect, light and dark (9 scenes) · ✓ ffprobe after-light.mp4 (1280×720, 42.7 s, 1068 frames) · ✓ ffprobe after-dark.mp4 (1280×720, 42.4 s, 1061 frames) · ✓ ffprobe before-light.mp4 (1280×720, 11.7 s, 292 frames) · ✓ light frames are the page (SSIM ≥ 0.989) · ✓ light screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7, 8, 9) · ✓ dark frames are the page (SSIM ≥ 0.985) · ✓ dark screenshots match baseline/ (written: 1, 2, 3, 4, 5, 6, 7, 8, 9) · ✓ a second run is the same (starts ±0.25 s, SSIM ≥ 0.996)
