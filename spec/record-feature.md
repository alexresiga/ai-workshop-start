# Feature recording
`node .agents/skills/record-feature/record.ts <scenes.ts> [--base <ref>] [--head <ref>] [--update]`: a video that shows a change
does what `spec/` says, for the PR reviewer. The skill: [record-feature](../.agents/skills/record-feature/SKILL.md).
`--base`: `origin/main` by default; `--head`: the working tree by default, else that commit.
A commit that is not there, as in a shallow clone → a clear message, exit 1.
## The clauses
- The change: `git diff <base> <head> -- spec/`; each changed bullet, its continuation lines joined, split at `;` outside `code`:
  the parts with a changed line are its **clauses**; a changed line outside a bullet too; not headings, not blank lines
- Each clause: its file, its line, its text; `record.ts --clauses [--base <ref>] [--head <ref>]` prints them, one a line
## The scenes
- A scenes file exports `scenes`: each has a `caption`, what it `covers` (a piece of a clause's text), and `run(page, act)`,
  which ends on an `expect` on what the clause promises
- And `notShown`: a piece of a clause's text → why the screen cannot show it
- A clause neither covered nor in `notShown`; a piece that is in no clause, or in more than one → each listed, exit 1, no video
## The recording
- The web view of the recorded commit on a free port, GitHub answering from this checkout's `fixture/` as `example/fixture`,
  the same for the before and the after: no network, no token
- 1280×720, a fixed clock, a visible cursor, typing at a reading pace, each key pressed shown, the caption at the bottom
- At `<head>`: light, dark, and light again; at `<base>`: light, the **before**
- A scene that fails at `<head>` → its caption and the error, exit 1, no video
- At `<base>`, the recording stops at the first scene that fails: where the change starts; none fails → a warning, the video shows nothing new
## The output, in `out/` beside the scenes file
- `after-light.mp4`, `after-dark.mp4`, `before-light.mp4`: H.264, yuv420p, a chapter for each scene, the captions as a subtitle track;
  `preview.gif`; `captions.vtt`; `trace-<name>.zip`, a Playwright trace for each
- `scenes.json`: each clause, the scenes that cover it and when they start, or why it is not shown; the checks
- `report.md`: the PR comment; `{{media}}` stands for where the files are published
## The checks: one fails → listed, exit 1
- Every scene's `expect` passes, light and dark
- ffprobe: each video 1280×720, under 60 s, with frames
- The frame at each scene's end is the page: SSIM ≥ 0.9 against the screenshot taken then
- That screenshot is `baseline/<n>-<light|dark>.png` beside the scenes file, SSIM ≥ 0.98; none yet, or `--update` → it is written
- Light twice: each scene starts within 0.5 s of the first run, and its end frame has SSIM ≥ 0.98 with the first run's
## Publishing
`bash .agents/skills/record-feature/publish.sh <scenes dir> <PR>`: `out/` on the `media` branch, under `<scenes dir>/<head commit>/`,
with no history of the code; then `report.md`, its `{{media}}` filled in, on the PR through `feedback.sh note`.
A check that failed, or `scenes.ts` or `baseline/` not committed as they are → listed, exit 1, nothing published.
`--dry-run`: prints what it would push and post, and changes nothing.
