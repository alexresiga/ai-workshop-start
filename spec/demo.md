# The demo
Skill Atlas in 30 seconds, to share: a video of the web view, made with the [record-feature](../.agents/skills/record-feature/SKILL.md) skill, and a post.
## The video
`recordings/demo/scenes.ts`, recorded against a commit without this file as `--base`, so that its clauses are this file's.
- **30 s at most**, as ffprobe measures it: `after-light.mp4` is the video, and the dark and before runs fit too
- An organization typed in: `JetBrains`, the tests' organization, as the recorder answers it; **Scan**: the spinner and
  `Listing JetBrains’s repositories…`
- Its repositories scanned one by one: `Scanned N of 5 repositories`, the bar moving on with each
- Then those with skills, most first, each with its `N skills` pill; the totals, `7 skills in 3 of 5 repositories.`
- Then haiku clusters the skills by theme, by itself, no button pressed: `Clustering 7 skills with haiku…`, then
  `Clustered K of 7 skills with haiku…` as its answer comes
- The clusters, collapsed: `7 skills in 3 clusters.`, each a theme and its `N skills` pill, the largest first
- Two opened, one after the other: each skill linked to its SKILL.md, with its repository and the first sentence of its description
## The post
- `recordings/demo/post.md`, to go with the video: what Skill Atlas does, in at most 600 characters, with at least 12 emojis, and
  a link to this repository
