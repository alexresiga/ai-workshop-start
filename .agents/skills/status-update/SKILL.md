---
name: status-update
description: Use when asked for a status update, a digest or a recap of what shipped in this repo since a date and time, posted to the Slack channel.
---

# Status update

Posts the PRs merged and the issues resolved in `alexresiga/ai-workshop-start` since a date and time, as one message with
emojis, in the private Slack channel `SLACK_CHANNEL_ID`, with `SLACK_BOT_TOKEN`. Contract: [spec/status-update.md](../../../spec/status-update.md).

## Steps

1. **Pick the start**: the date and time asked for, in ISO 8601. A date alone is midnight UTC (`2026-10-21`); give a
   time and a zone for anything else (`2026-10-21T09:00Z`, `2026-10-21T11:00+02:00`). If none was asked for, use when
   the last status update was posted in the channel, or else the last 24 hours, and say which in your answer.
2. **Check it**: `node .agents/skills/status-update/status.ts --since <start> --dry-run` prints the message and posts nothing.
3. **Post it**: the same, without `--dry-run`. It prints `posted in Slack: <link>`, once per message: a long update goes
   out as several messages of at most 4,000 characters, so Slack truncates none.

`--repo owner/name` reports on another repository. `GITHUB_TOKEN` or `GH_TOKEN`, if set, is used for GitHub.

## What goes in

- **Merged PRs**: merged at or after the start. PRs closed without merging are left out.
- **Resolved issues**: closed as *completed* at or after the start. Issues closed as "not planned" or as duplicates are left out.
- Each one is a linked `#N title` by `@author`, oldest first. Nothing at all → a short `🦗 Nothing merged or resolved…` message, still posted.

## Exit codes

| Exit | Meaning |
| --- | --- |
| 0 | Posted, or printed with `--dry-run` |
| 1 | GitHub or Slack refused, or is out of reach: nothing posted; say so |
| 2 | A bad command line, or no `SLACK_BOT_TOKEN` or `SLACK_CHANNEL_ID`: nothing posted |
