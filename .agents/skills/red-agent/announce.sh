#!/usr/bin/env bash
# spec/red-agent.md: posts a filed bug in the Slack channel, so the team sees it. The issue stands whatever Slack says:
# a missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID, or a refusal, is a warning, exit 0.
#
#   announce.sh <issue url> <title>
set -uo pipefail

[[ $# -eq 2 ]] || { echo 'usage: announce.sh <issue url> <title>' >&2; exit 2; }
if [[ -z ${SLACK_BOT_TOKEN:-} || -z ${SLACK_CHANNEL_ID:-} ]]; then
  echo 'warning: no SLACK_BOT_TOKEN or SLACK_CHANNEL_ID: not posted in Slack' >&2
  exit 0
fi
api=${SLACK_API:-https://slack.com/api}
text=$(printf '🐞 The red agent filed a bug: <%s|%s>' "$1" "$(printf %s "$2" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g')")
answer=$(curl -sS --max-time 20 -X POST "${api%/}/chat.postMessage" \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" -H 'Content-Type: application/json; charset=utf-8' \
  --data "$(jq -n --arg channel "$SLACK_CHANNEL_ID" --arg text "$text" '{channel: $channel, text: $text}')" 2>&1)
if [[ $(jq -r '.ok // false' <<<"$answer" 2>/dev/null) != true ]]; then
  error=$(jq -r '.error // empty' <<<"$answer" 2>/dev/null)
  echo "warning: not posted in Slack: ${error:-$answer}" >&2
  exit 0
fi
echo "posted in Slack: $1"
