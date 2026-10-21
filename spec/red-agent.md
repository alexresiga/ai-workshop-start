# Red agent
Breaks the web view and files one issue per bug, with its steps and a video, labelled `delegated to AI`, so the
`issue-to-pr` automation fixes it. The skill: [red-agent](../.agents/skills/red-agent/SKILL.md).
## The steps
`node .agents/skills/red-agent/repro.ts <steps.ts>`: a bug, recorded against the web view of this checkout.
- A steps file exports `title`, the issue's title; `expected`, what `spec/` promises; and `steps`: each has a `caption` and
  `run(page, act)`; the last ends on an `expect` of what the spec promises, which fails while the bug is there
- One of them missing or empty → `<file> exports no <name>`, exit 1, no video; no steps file → a clear message, exit 2
- The page, the cursor, the captions and the actions as in [the feature recording](record-feature.md): `example/fixture` from
  `fixture/`, 1280×720, light, a fixed clock, no network
## The recording
- Run **twice**; each run stops at the first step that fails
- Both fail at the last step → the bug, exit 0
- Every step passes → `every step passes: no bug to report`, exit 1, no video
- An earlier step fails → `step <n> fails, not the last`, and its error, exit 1, no video
- Only one run fails → `it fails in only 1 of 2 runs`, exit 1, no video
## The output, in `out/` beside the steps file
- `repro.mp4`: H.264, a chapter for each step, the captions as a subtitle track, the failing step's caption marked `✗`;
  `preview.gif`; `captions.vtt`; `trace.zip`; `steps.ts`, a copy
- `repro.json`: the title, the expected, the commit, the failing step and its error, the checks; ffprobe: 1280×720, under 60 s, with frames
- `issue.md`: the issue body: the commit, the preview, links to the video, the steps file, the captions and the trace; the steps,
  numbered, opening the fixture first; **Expected**; **Actual**, the error with no colours and no call log, at most 12 lines;
  `{{media}}` stands for where the files are published
## Filing
`bash .agents/skills/red-agent/file.sh [--dry-run] <bug dir> [footer]`: `out/` on the `media` branch, under
`recordings/bugs/<bug dir name>/<commit>/`; then one issue on `alexresiga/ai-workshop-start`, its title the steps' title,
its body `issue.md` with `{{media}}` filled in and the footer under a rule, labelled `delegated to AI`.
- No recording, or a check that failed → listed, exit 1, nothing filed
- An open issue with the same title → `already open: <url>`, exit 1, nothing filed
- `--dry-run`: prints what it would push, file and post, and changes nothing
## Posting in Slack
`bash .agents/skills/red-agent/announce.sh <issue url> <title>`, run by `file.sh` once the issue is filed: the issue, posted
in the channel, as `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID` set for [asking](ask.md); `SLACK_API` too.
- The message: `🐞 The red agent filed a bug: <url|title>`, the title escaped (`&`, `<`, `>`); `posted in Slack: <url>` on stdout
- No `SLACK_BOT_TOKEN` or `SLACK_CHANNEL_ID` → a warning, exit 0, nothing posted
- Slack refuses or is out of reach → its error as a warning, exit 0: the issue stands
## The skill
- A bug: the page disagrees with `spec/`; or a crash, a console error, a stuck page, a broken layout, repository text as HTML
- At most 5 issues a run, most severe first; none for a bug already open
- A bug that only shows on a live repository → filed by hand, its steps, no video
