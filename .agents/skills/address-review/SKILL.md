---
name: address-review
description: Use when asked to address, answer, or follow up on review feedback on an open PR in this repo, including from a scheduled automation that picks up after the issue-to-pr session has ended.
---

# Address review

Answers new feedback on open PRs in `alexresiga/ai-workshop-start`. A fresh session runs this: it cannot rely on what an earlier session did, only on what is on the PR.

## Never answer twice

All feedback goes through [`feedback.sh`](feedback.sh), shared with the `issue-to-pr` skill. Every agent comment carries a hidden `<!-- agent: KEY -->` marker, so the PR itself records what has been answered.

- `feedback.sh pending PR`: feedback with no answer or claim yet.
- `feedback.sh claim PR KEY`: posts "On it". Exit 1 means another run has it: skip it.
- `feedback.sh answer PR KEY TEXT`: turns the claim into the answer.
- `feedback.sh note PR TEXT`: any other comment.

Claim before you start work on an item, and post on the PR only through this script.

## Steps

For each PR given, or else each open PR (`gh pr list --state open`):

1. `git switch` to its branch and `git pull --rebase`. Read `spec/` and the code it touches.
2. For each item from `feedback.sh pending PR`, oldest first:
   1. `feedback.sh claim PR KEY`. On exit 1, go to the next item.
   2. Make the change if one is needed: update `spec/` and its integration tests too. `npm test` and `npm run typecheck` pass. Commit and `git push`.
   3. `feedback.sh answer PR KEY "<what you did, with the commit, or why not>"`.
3. If the PR is approved (`gh pr view PR --json reviewDecision`) and nothing is pending, merge it: `gh pr merge --rebase --delete-branch`.

Don't stop for the user: if feedback is unclear, make a sensible call and say so in the answer.
