---
name: issue-to-pr
description: Use when asked to implement, fix, or close a GitHub issue in this repo (by number or URL), or to take an issue through to a merged PR.
---

# Issue to PR

Takes issue `N` from `alexresiga/ai-workshop-start` to a merged PR.

1. **Read** the issue: `gh issue view N --comments`. Read `spec/` and the code it touches. 
2. **Post the plan** on the issue: `gh issue comment N --body "<plan>"`, saying you are working on it.
3. **Implement** on a branch: `git switch -c issue-N-<slug> origin/main`. Update `spec/`, add an integration test for each case, make the change. `npm test` and `npm run typecheck` pass.
4. **Open a PR**: commit, `git push -u origin HEAD`, `gh pr create --repo alexresiga/ai-workshop-start --base main` with `Closes #N` in the body.
5. **Record it**, if the change shows in the web view: follow [record-feature](../record-feature/SKILL.md), and commit `scenes.ts` and `baseline/` to the PR branch.
6. **Ask for feedback** on the PR: `.agents/skills/address-review/feedback.sh note PR "<request>"`.
7. **Watch the PR** every 5 minutes (`sleep 300`), for at most an hour. Each time, follow step 2 of [address-review](../address-review/SKILL.md): answer only through `feedback.sh`, so this session and the address-review automation never answer the same comment twice.
8. **Merge it** once it is approved and nothing is pending: `gh pr merge --rebase --delete-branch`. If the hour runs out first, stop: the address-review automation takes over.

Don't stop for the user before the PR is open: if something is unclear, make a sensible call, note it in the PR body, and keep going.
