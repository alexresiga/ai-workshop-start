#!/usr/bin/env bash
# spec/red-agent.md: files a recorded bug. Puts its out/ on the media branch, under recordings/bugs/<slug>/<head commit>/,
# then opens one issue, labelled "delegated to AI", with issue.md as the body, its {{media}} filled in; then posts it in Slack.
#
#   file.sh [--dry-run] <bug dir> [footer]
set -euo pipefail

repo='alexresiga/ai-workshop-start'
label='delegated to AI'

dry=false
if [[ ${1:-} == --dry-run ]]; then dry=true; shift; fi
[[ $# -ge 1 && $# -le 2 ]] || { echo 'usage: file.sh [--dry-run] <bug dir> [footer]' >&2; exit 2; }

repository=$(git rev-parse --show-toplevel)
dir=$(cd "$1" && pwd)
out="$dir/out"
repro="$out/repro.json"
[[ -f $repro ]] || { echo "no recording: $repro" >&2; exit 1; }
if jq -e '[.checks[] | select(.ok | not)] | length > 0' "$repro" >/dev/null; then
  echo 'a check failed: record again before filing' >&2
  jq -r '.checks[] | select(.ok | not) | "✗ \(.name): \(.detail)"' "$repro" >&2
  exit 1
fi

title=$(jq -r .title "$repro")
# The same bug, open already: a comment there is better than a second run on it. Every open issue, matched here:
# GitHub's search would read the title as query syntax, and a `:` or `(` would find nothing.
same=$(gh issue list --repo "$repo" --state open --json title,url --limit 1000 \
  | jq -r --arg t "$title" '.[] | select(.title == $t) | .url' | head -1)
if [[ -n $same ]]; then
  echo "already open: $same" >&2
  exit 1
fi

dest="recordings/bugs/$(basename "$dir")/$(jq -r .head "$repro")"
media="https://raw.githubusercontent.com/$repo/media/$dest"
body=$(sed "s#{{media}}#$media#g" "$out/issue.md")
[[ -n ${2:-} ]] && body="$body

---
$2"

if $dry; then
  echo "would push to media:$dest/"
  (cd "$out" && ls -1)
  echo "would open an issue labelled \"$label\": $title"
  echo "$body"
  echo "would post it in Slack: ${SLACK_CHANNEL_ID:-no SLACK_CHANNEL_ID}"
  exit 0
fi

work=$(mktemp -d)
trap 'git -C "$repository" worktree remove --force "$work/media" 2>/dev/null; rm -rf "$work"' EXIT
if git -C "$repository" fetch --quiet origin media 2>/dev/null; then
  git -C "$repository" worktree add --quiet --detach "$work/media" FETCH_HEAD
else
  git -C "$repository" worktree add --quiet --orphan -b media "$work/media"
fi
mkdir -p "$work/media/$dest"
cp "$out"/* "$work/media/$dest/"
git -C "$work/media" add "$dest"
git -C "$work/media" commit --quiet -m "Bug: $dest"
git -C "$work/media" push --quiet origin HEAD:refs/heads/media
url=$(gh issue create --repo "$repo" --title "$title" --label "$label" --body "$body")
echo "$url"
bash "$(dirname "$0")/announce.sh" "$url" "$title"
