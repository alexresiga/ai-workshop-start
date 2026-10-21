# Ready to merge
`bash .agents/skills/address-review/feedback.sh ready <PR>`: once a review round leaves nothing to answer, the PR is
rebased on the latest `main` and labelled `ready to merge`, with each issue it closes. The `issue-to-pr` and
`address-review` skills run it after each round, then merge once the PR is approved. The skills:
[issue-to-pr](../.agents/skills/issue-to-pr/SKILL.md), [address-review](../.agents/skills/address-review/SKILL.md).
## Not ready
- Feedback still pending (`feedback.sh pending`) → `not ready: <n> pending` on stderr, exit 1, the label taken off the PR
  and its issues, nothing rebased or pushed
- The PR's branch not checked out → `check out <branch> first`, exit 2; uncommitted changes → `uncommitted changes: commit
  them first`, exit 2; the branch not at its latest `origin/<branch>`, as when another run pushed to it → `<branch> is not
  at origin/<branch>: pull first`, exit 2; nothing labelled, nothing pushed
- Rebasing on `origin/main` conflicts → the rebase aborted, the branch as it was, the label taken off, a note on the PR,
  `Not ready to merge: rebasing on main conflicts in <files>. …`, exit 1, nothing pushed
- Rebased, but `npm test` or `npm run typecheck` fails → the branch back where it was, the label taken off, a note on the
  PR, `Not ready to merge: rebased on main, the tests or the typecheck fail. …`, exit 1, nothing pushed
- `origin/<branch>` moves while it rebases → the push refused, the branch back where it was, the label taken off,
  `not ready: origin/<branch> moved while rebasing: pull first`, exit 1: what another run pushed stands
- The same note is posted *once*: a PR that already has it gets no other
## Ready
- Nothing pending, the branch rebased on the latest `origin/main`; if that moved it, `npm test` and `npm run typecheck`
  pass, and it is pushed with `--force-with-lease`, over the `origin/<branch>` it was rebased from only
- Already on the latest `main` → no tests run, nothing new pushed
- Then `ready to merge` on the PR and on each issue it closes; `ready to merge: #<PR> #<issue> …` on stdout, exit 0
