#!/usr/bin/env bash
# spec/record-feature.md: puts a recording's out/ on the media branch, under <scenes dir>/<head commit>/, then posts
# its report.md on the PR through feedback.sh, so the PR records it like any other agent comment.
#
#   publish.sh [--dry-run] <scenes dir> <PR>
set -euo pipefail

dry=false
if [[ ${1:-} == --dry-run ]]; then dry=true; shift; fi
[[ $# -eq 2 ]] || { echo 'usage: publish.sh [--dry-run] <scenes dir> <PR>' >&2; exit 2; }

here=$(cd "$(dirname "$0")" && pwd)
repository=$(git rev-parse --show-toplevel)
dir=$(cd "$1" && pwd)
out="$dir/out"
scenes="$out/scenes.json"
[[ -f $scenes ]] || { echo "no recording: $scenes" >&2; exit 1; }
if jq -e '[.checks[] | select(.ok | not)] | length > 0' "$scenes" >/dev/null; then
  echo 'a check failed: record again before publishing' >&2
  jq -r '.checks[] | select(.ok | not) | "✗ \(.name): \(.detail)"' "$scenes" >&2
  exit 1
fi

# What recorded it is on the PR branch, so the recording can be made again.
# Untracked, ignored or not, and changed since the last commit.
unsaved=$(git -C "$repository" ls-files --others -- "$dir/scenes.ts" "$dir/baseline"; git -C "$repository" diff HEAD --name-only -- "$dir/scenes.ts" "$dir/baseline")
if [[ -n $unsaved ]]; then
  echo 'commit scenes.ts and baseline/ first:' >&2
  echo "$unsaved" >&2
  exit 1
fi

dest="${dir#"$repository"/}/$(jq -r .head "$scenes")"
media="https://raw.githubusercontent.com/alexresiga/ai-workshop-start/media/$dest"
body=$(sed "s#{{media}}#$media#g" "$out/report.md")

if $dry; then
  echo "would push to media:$dest/"
  (cd "$out" && ls -1)
  echo "would post on PR $2:"
  echo "$body"
  exit 0
fi

work=$(mktemp -d)
trap 'git -C "$repository" worktree remove --force "$work/media" 2>/dev/null; rm -rf "$work"' EXIT
if git -C "$repository" fetch --quiet origin media 2>/dev/null; then
  git -C "$repository" worktree add --quiet --detach "$work/media" FETCH_HEAD
else
  # The first recording: a branch of its own, with no history of the code.
  git -C "$repository" worktree add --quiet --orphan -b media "$work/media"
fi
mkdir -p "$work/media/$dest"
cp "$out"/* "$work/media/$dest/"
git -C "$work/media" add "$dest"
git -C "$work/media" commit --quiet -m "Recording: $dest"
git -C "$work/media" push --quiet origin HEAD:refs/heads/media
bash "$here/../address-review/feedback.sh" note "$2" "$body"
