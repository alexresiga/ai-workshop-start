---
name: code-review
description: Review a diff, branch, or PR in this repo. Use when asked to review code. Produces a short summary plus inline comments, each giving the location and how to reproduce the problem.
---

# Code review

## Scope

- Default target: current branch diff against `main` (`git diff main...HEAD`), plus uncommitted changes.
- Read the relevant [spec](../../../spec/) first. The spec is the source of truth; code that disagrees with it is a finding, and so is a spec change with no matching code or test.

## What to look for

1. Correctness bugs: wrong output, crashes, unhandled edge cases.
2. Spec drift: behavior not in the spec, or spec cases not implemented.
3. Missing tests: every spec case needs an integration test in `tests/`.
4. Then, only if worth it: needless complexity or duplication.

Skip style nits a formatter or `npm run typecheck` would catch.

## Verify before reporting

Run `npm test` (and `npm run typecheck`). Reproduce each finding yourself where possible; drop anything you cannot back up.

## Output

Keep it short.

**Summary**: 1–3 sentences: overall verdict and test status.

**Inline comments**: one per finding, most severe first:

```
`path/to/file.ts:42` — <problem in one sentence>
Repro: <exact command, input, or fixture that triggers it> → <observed> (expected <expected>)
Fix: <one-line suggestion>
```

Every comment must have a `file:line` and a concrete repro. No repro, no comment. If nothing survives, say "No findings" and state the test result.
