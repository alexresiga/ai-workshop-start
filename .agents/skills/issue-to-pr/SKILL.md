---
name: issue-to-pr
description: Use when asked to implement, fix, or close a GitHub issue in this repo (by number or URL), or to take an issue through to a merged PR.
---

# Issue to PR

Takes issue `N` from `alexresiga/ai-workshop-start` to a merged PR.

1. **Read** the issue: `gh issue view N --comments`. Read `spec/` and the code it touches. 
2. **Ask about open decisions**: if the issue leaves a decision open that `spec/`, the code and the comments don't settle, ask in Slack and wait: `node .agents/skills/issue-to-pr/ask.ts "<question>"`. Ask once, with every open point in one message: start it with `<!here>` so the channel is notified, then the issue link, the options, and the call you would make, and end it with "Reply in this thread: replies in the channel are not seen." `ask.ts` reads only the thread. The answer is on stdout (exit 0). Exit 1 means no answer came in 15 minutes, so make that call. Exit 2 means it could not ask (`SLACK_BOT_TOKEN` or `SLACK_CHANNEL_ID` missing, or Slack refused). Either way, go on with the work. Contract: [spec/ask.md](../../../spec/ask.md).
3. **Post the plan** on the issue: `gh issue comment N --body "<plan>"`, saying you are working on it, with the decisions and who made them.
4. **Implement** on a branch: `git switch -c issue-N-<slug> origin/main`. Update `spec/`, add an integration test for each case, make the change. `npm test` and `npm run typecheck` pass.
5. **Open a PR**: commit, `git push -u origin HEAD`, `gh pr create --repo alexresiga/ai-workshop-start --base main` with `Closes #N` in the body.
6. **Record it**, if the change shows in the web view: follow [record-feature](../record-feature/SKILL.md), and commit `scenes.ts` and `baseline/` to the PR branch.
7. **Ask for feedback** on the PR: `.agents/skills/address-review/feedback.sh note PR "<request>"`.
8. **Watch the PR** every 5 minutes (`sleep 300`), for at most an hour. Each time, follow step 2 of [address-review](../address-review/SKILL.md): answer only through `feedback.sh`, so this session and the address-review automation never answer the same comment twice. Then run `feedback.sh ready PR`: once nothing is pending, it rebases the branch on the latest `main`, runs the tests and pushes, and labels the PR and the issue `ready to merge`. Contract: [spec/feedback.md](../../../spec/feedback.md).
9. **Merge it** once it is approved and `feedback.sh ready PR` exits 0: `gh pr merge --rebase --delete-branch`. If the hour runs out first, stop: the address-review automation takes over.

Don't stop for the user before the PR is open: beyond the one wait in step 2, if something is unclear, make a sensible call and keep going. Put each open decision in the PR body: the question, the Slack link, and the answer, or the call you made when none came.
