---
name: issue-to-pr
description: Use when asked to implement, fix, or close a GitHub issue in this repo (by number or URL), or to take an issue through to a merged PR.
---

# Issue to PR

Takes one issue from `alexresiga/ai-workshop-start` to a merged PR. The [spec](../../../spec/) leads, tests prove it, nothing merges without the user's go-ahead.

Input: an issue number `N`. Abbreviated `R=alexresiga/ai-workshop-start` below.

## Steps

### 1. Read the source

- `gh issue view N --repo $R --comments`: the issue itself, not a summary.
- Images (mockups) in the body: download each and look at it. `user-attachments` URLs need auth: `curl -sL -H "Authorization: token $(gh auth token)" -o /tmp/issue-N-1.png <url>`, then read the file.
- Read `spec/`, the `src/` files the issue touches, `tests/helpers.ts`, a test file near the change, and `git log -5` for commit style.

**Stop if** you cannot state each acceptance criterion as an input and an observable output. Post the questions with `gh issue comment N --repo $R`, report them to the user, end.

### 2. Spec first

`git fetch origin && git switch -c issue-N-<slug> origin/main`. Write the acceptance criteria into the right `spec/*.md`, in its style. Every case there becomes a test.

### 3. Tests first: red

One integration test per spec case, in `tests/`, reusing `tests/helpers.ts` and `fixture/`. Run `npm test` and keep the output: **each new test must fail, for the reason the feature is missing**, not a typo or import error. A new test that passes already proves nothing; fix it or drop the case.

### 4. Implement: green

The smallest change that makes the tests pass. Only what the issue asks for: no drive-by refactors, no unrelated fixes (note them for the user instead).

### 5. Check

- `npm test` and `npm run typecheck` both clean. Keep the output.
- Run the `code-review` skill on the branch. Fix every finding or answer it in the PR body.
- `./skill-atlas scan .` lists every skill with no warnings.

### 6. PR

Commit in the repo's style (subject says what changed for the user; body says why), then `git push -u origin HEAD` and `gh pr create --repo $R --base main`. The body:

```
Closes #N

| Acceptance criterion | Test |
|---|---|
| <criterion> | `tests/<file>.test.ts` › <test name> |

Red, before the change: <failing lines from step 3>
Green: <npm test + typecheck summary>
Review: <findings and what was done about each, or "No findings">
```

### 7. Merge

1. `git fetch origin && git rebase origin/main`; if `main` moved, rerun `npm test` and `npm run typecheck`, then `git push --force-with-lease` (to the branch only).
2. **Ask the user for an explicit go-ahead to merge.** Show the PR URL and test status. No answer, no merge.
3. `gh pr merge --repo $R --rebase --delete-branch`.
4. Confirm: `gh issue view N --repo $R --json state` is `CLOSED`; `git switch main && git pull --rebase && npm test` passes.

## Stop and report

Any of these: stop, leave the branch as is, tell the user what happened and what you'd suggest.

| Situation | Do |
|---|---|
| Unclear requirement | Ask on the issue (step 1); don't guess |
| Test stays red after a real attempt | Report the failing output; don't weaken or skip the test |
| Rebase conflict | `git rebase --abort`; report the conflicting files |
| Review finding you can't fix in scope | Put it in the PR body; ask before merging |
| User hasn't approved the merge | Wait |

Never: push to `main`, `--force` (only `--force-with-lease`, only on the issue branch), merge commits, `--no-verify`, merging with red tests.
