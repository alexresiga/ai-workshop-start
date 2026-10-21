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
#   feedback.sh ready PR            rebase on main and label the PR and its issues "ready to merge"
set -euo pipefail

repo='repos/alexresiga/ai-workshop-start'
label='ready to merge'

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

note() { # pr text
  gh api -X POST "$repo/issues/$1/comments" -f body="$2

<!-- agent: note -->" --jq .html_url
}

# A note, unless the PR already has the same one: each round of watching asks again.
note_once() { # pr text
  fetch "issues/$1/comments" x | jq -e --arg b "$2

<!-- agent: note -->" 'select(.body == $b)' >/dev/null || note "$1" "$2" >/dev/null
}

# The label on the PR and on each issue it closes. Removing one that is not there is no error.
labels() { # add|remove pr issues...
  local how=$1 n
  shift
  for n in "$@"; do
    if [[ $how == add ]]; then
      gh api -X POST "$repo/issues/$n/labels" -f "labels[]=$label" >/dev/null
    else
      gh api -X DELETE "$repo/issues/$n/labels/${label// /%20}" >/dev/null 2>&1 || true
    fi
  done
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
    note "$2" "$3"
    ;;
  ready)
    # Ready: nothing pending, rebased on the latest main, the tests pass, pushed. Then labelled.
    pr=$2
    info=$(gh pr view "$pr" --repo "${repo#repos/}" --json headRefName,closingIssuesReferences \
      --jq '[.headRefName] + [.closingIssuesReferences[].number | tostring] | join(" ")')
    read -r head rest <<<"$info"
    read -ra issues <<<"${rest:-}"
    count=$(bash "$0" pending "$pr" | jq length)
    if ((count > 0)); then
      labels remove "$pr" "${issues[@]}"
      echo "not ready: $count pending" >&2
      exit 1
    fi
    [[ $(git branch --show-current) == "$head" ]] || { echo "check out $head first" >&2; exit 2; }
    [[ -z $(git status --porcelain --untracked-files=no) ]] || { echo "uncommitted changes: commit them first" >&2; exit 2; }
    # Another run may have pushed to the branch: rebase only what is on the PR, and push only over that.
    git fetch -q origin main "$head"
    before=$(git rev-parse HEAD)
    [[ $before == $(git rev-parse "origin/$head") ]] || { echo "$head is not at origin/$head: pull first" >&2; exit 2; }
    if ! git rebase -q origin/main >/dev/null 2>&1; then
      conflicts=$(git diff --name-only --diff-filter=U | paste -sd ' ')
      git rebase --abort
      labels remove "$pr" "${issues[@]}"
      note_once "$pr" "Not ready to merge: rebasing on main conflicts in ${conflicts:-the branch}. The branch is left as it was."
      echo "not ready: rebasing on main conflicts in ${conflicts:-the branch}" >&2
      exit 1
    fi
    if [[ $(git rev-parse HEAD) != "$before" ]]; then
      echo "rebased on origin/main" >&2
      if ! { npm test && npm run typecheck; } >&2; then
        git reset -q --hard "$before"
        labels remove "$pr" "${issues[@]}"
        note_once "$pr" "Not ready to merge: rebased on main, the tests or the typecheck fail. The branch is left as it was."
        echo "not ready: rebased on main, the tests or the typecheck fail" >&2
        exit 1
      fi
    fi
    if ! git push -q --force-with-lease="$head:$before" origin "HEAD:$head"; then
      git reset -q --hard "$before"
      labels remove "$pr" "${issues[@]}"
      echo "not ready: origin/$head moved while rebasing: pull first" >&2
      exit 1
    fi
    labels add "$pr" "${issues[@]}"
    printf 'ready to merge: #%s' "$pr"
    ((${#issues[@]} == 0)) || printf ' #%s' "${issues[@]}"
    echo
    ;;
  *)
    sed -n '9,13p' "$0" >&2
    exit 2
    ;;
esac
