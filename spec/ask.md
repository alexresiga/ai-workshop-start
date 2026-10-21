# Asking in Slack
`node .agents/skills/issue-to-pr/ask.ts "<question>" [--wait <minutes>] [--poll <seconds>]`: a decision the issue leaves open,
asked of the team, for the `issue-to-pr` skill. The skill: [issue-to-pr](../.agents/skills/issue-to-pr/SKILL.md).
`SLACK_BOT_TOKEN` and `CHANNEL_ID`, required: the bot, and the channel it asks in. `SLACK_API`: the Slack Web API, `https://slack.com/api` by default.
`--wait`: 15 minutes by default; `--poll`: 30 seconds by default.
## Asking
- The question is posted to the channel, as it is; its link goes to *stderr*, at once
- A missing question, a missing or bad option, or no `SLACK_BOT_TOKEN` or `CHANNEL_ID` → a clear message, exit 2, nothing posted
- Slack refuses the question (`not_in_channel`, `invalid_auth`, …) or is out of reach → its error, exit 2
## Waiting
- The answer: the replies in the question's thread, *oldest first*, each `<user>: <text>` on stdout, exit 0
- It waits until the first reply, checking every `--poll`; then it takes every reply there is then
- The bot's own messages in the thread are not an answer
- Each reply read is marked with a *funny emoji* reaction, one picked at random from `REACTIONS`; one that fails, such as
  no `reactions:write` scope, → a warning on stderr, the answer stands
- No reply in `--wait` minutes → `No answer in <N> minutes` on stderr, exit 1: go on without one
- A check that fails, Slack out of reach or a rate limit, → a warning on stderr, and the wait goes on
- Slack refuses the thread for good (`invalid_auth`, `account_inactive`, `token_revoked`, `not_in_channel`, …) → its error, exit 1 at once
