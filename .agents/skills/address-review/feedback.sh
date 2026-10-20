#!/usr/bin/env bash
# PR feedback ledger shared by the issue-to-pr and address-review skills.
#
# Every comment the agent posts carries <!-- agent: KEY -->. KEY names the
# feedback it answers (issue-ID, review-ID or line-ID), or "note" for anything
# else. A feedback comment is pending while no agent comment names its KEY, so
# the ledger lives on the PR itself and any session can read it.
#
#   feedback.sh pending PR          pending feedback, as a JSON array
#   feedback.sh claim PR KEY        reply "On it"; exit 1 if another run got there first
#   feedback.sh answer PR KEY TEXT  turn the claim into the answer
#   feedback.sh note PR TEXT        post a comment that is not an answer
set -euo pipefail

repo='repos/alexresiga/ai-workshop-start'

fetch() { # endpoint kind
  gh api --paginate "$repo/$1" --jq ".[] | {key: \"$2-\\(.id)\", id, author: .user.login,
    body: (.body // \"\"), path, line, url: .html_url}"
}

all_comments() { # pr
  fetch "issues/$1/comments" issue
  fetch "pulls/$1/comments" line
  fetch "pulls/$1/reviews" review
}

# Ids of agent comments marked with KEY, oldest first. Line feedback is
# answered in its thread, everything else as a PR comment.
claims() { # pr key
  local endpoint="issues/$1/comments"
  [[ $2 == line-* ]] && endpoint="pulls/$1/comments"
  fetch "$endpoint" x | jq -r --arg m "<!-- agent: $2 -->" 'select(.body | contains($m)) | .id' | sort -n
}

edit() { # pr key id body
  local endpoint="issues/comments/$3"
  [[ $2 == line-* ]] && endpoint="pulls/comments/$3"
  gh api -X PATCH "$repo/$endpoint" -f body="$4" --jq .html_url
}

case "${1:-}" in
  pending)
    all_comments "$2" | jq -s '
      [.[].body | scan("<!-- agent: ([a-z]+-[0-9]+) -->") | .[0]] as $done
      | map(select(.body != "" and (.body | contains("<!-- agent") | not)
                   and (.key | IN($done[]) | not)))
      | map(del(.id))'
    ;;
  claim)
    pr=$2 key=$3 body="On it. <!-- agent: $key -->"
    case $key in
      line-*) mine=$(gh api -X POST "$repo/pulls/$pr/comments/${key#line-}/replies" -f body="$body" --jq .id) ;;
      issue-* | review-*) mine=$(gh api -X POST "$repo/issues/$pr/comments" -f body="$body" --jq .id) ;;
      *) echo "bad key: $key" >&2; exit 2 ;;
    esac
    # Two runs may claim at once: the oldest claim wins, the other backs off.
    first=$(claims "$pr" "$key" | head -1)
    if [[ $first != "$mine" ]]; then
      endpoint="issues/comments/$mine"
      [[ $key == line-* ]] && endpoint="pulls/comments/$mine"
      gh api -X DELETE "$repo/$endpoint" >/dev/null
      echo "$key is already claimed" >&2
      exit 1
    fi
    ;;
  answer)
    pr=$2 key=$3
    first=$(claims "$pr" "$key" | head -1)
    [[ -n $first ]] || { echo "claim $key first" >&2; exit 1; }
    edit "$pr" "$key" "$first" "$4

<!-- agent: $key -->"
    ;;
  note)
    gh api -X POST "$repo/issues/$2/comments" -f body="$3

<!-- agent: note -->" --jq .html_url
    ;;
  *)
    sed -n '9,12p' "$0" >&2
    exit 2
    ;;
esac
