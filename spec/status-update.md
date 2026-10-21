# Status update
`node .agents/skills/status-update/status.ts --since <date or date and time> [--repo <owner/name>] [--dry-run]`: the PRs merged
and the issues resolved since then, posted in the Slack channel. The skill: [status-update](../.agents/skills/status-update/SKILL.md).
`SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`, the private channel, as for [asking](ask.md); `SLACK_API` too. `GITHUB_TOKEN` or
`GH_TOKEN`, optional; `GITHUB_API`: `https://api.github.com` by default. `--repo`: `alexresiga/ai-workshop-start` by default.
## The command line
- `--since`, required, ISO 8601: a date, `2026-10-21`, is midnight UTC; a date and time with a zone, `2026-10-21T09:00Z` or
  `2026-10-21T11:00+02:00`; with no zone, UTC
- No `--since`, a bad date (`2026-02-30`, `yesterday`), a bad `--repo` or an unknown argument → a clear message and the usage, exit 2, nothing posted
- No `SLACK_BOT_TOKEN` or `SLACK_CHANNEL_ID` → a clear message, exit 2, nothing posted; with `--dry-run` they are not needed
## What goes in
- The PRs merged at or after `--since`; PRs closed without merging and PRs merged before are not
- The issues closed as *completed* at or after `--since`; issues closed as `not_planned` or as duplicates, issues closed
  before, and PRs are not
- Every page GitHub has, 100 at a time
- Each section oldest first; each line `• <url|#N title> by @author`, the title escaped (`&`, `<`, `>`)
## The message
- A header, `📣 *Status update for <repo>* since <YYYY-MM-DD HH:MM> UTC`; `🚀 *Merged PRs (N)*`, its lines; `✅ *Resolved issues (N)*`,
  its lines; a section with none → `• _none_`; then `🎉 <N> PR(s) merged, <N> issue(s) resolved. Keep shipping! 🙌`
- Nothing merged or resolved → `🦗 Nothing merged or resolved in *<repo>* since <YYYY-MM-DD HH:MM> UTC. Quiet times! 😴`, still posted
## Posting
- The message posted in `SLACK_CHANNEL_ID`, with the token, link previews off; `posted in Slack: <permalink>` on stdout, exit 0
- `--dry-run` → the message on stdout, exit 0, nothing posted
- GitHub refuses (a rate limit, a missing repository) → `GitHub answered <status> for <path>`, exit 1, nothing posted
- Slack refuses (`not_in_channel`, `invalid_auth`, …) or is out of reach → its error, exit 1
