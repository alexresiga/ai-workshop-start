---
name: issue-to-pr
description: Use when asked to implement, fix, or close a GitHub issue in this repo (by number or URL), or to take an issue through to a merged PR.
---

# Issue to PR

Takes issue `N` from `alexresiga/ai-workshop-start` to a merged PR.

1. **Read** the issue: `gh issue view N --comments`. Read `spec/` and the code it touches.
2. **Implement** on a branch: `git switch -c issue-N-<slug> origin/main`. Update `spec/`, add an integration test for each case, make the change. `npm test` and `npm run typecheck` pass.
3. **Open a PR**: commit, `git push -u origin HEAD`, `gh pr create --base main` with `Closes #N` in the body.
4. **Merge it**: `gh pr merge --rebase --delete-branch`.

If the issue is unclear or a test won't pass, stop and ask the user.
