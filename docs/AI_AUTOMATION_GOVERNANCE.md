# AI Automation Governance

## Goal
Keep Beauty OS AI automation paused, low-cost, reviewable, and unable to pollute `main`.

## Rules
- AI automation stays paused unless explicitly re-enabled.
- Every AI output starts as a **draft PR**.
- `AI_MERGE_ALLOWED` defaults to `false`.
- `AI_SELF_REPAIR_ALLOWED` defaults to `false`.
- Engine lane is always high risk.
- High-risk work never auto-merges.
- Product work can only be low risk when it stays in `src/app`, `src/components`, `src/lib`, or `src/styles`, touches 1–3 files, and passes build/lint/typecheck/test.
- No workflow, auth, payment, env, package, database, or migration changes may auto-merge.
- AI must not generate import statements as filenames.
- AI must not create strange root files or write outside the repo allowlist.
- AI must not create more than one PR per cycle.

## Review policy
- Human review is always required.
- Draft PRs remain draft until a human explicitly reviews them.
- Auto-merge is off unless a human turns it on later and the PR is still eligible.

## Operational safety
- Prefer cheap models for simple tasks.
- Send only task description, relevant file list, selected diff, and minimal required context.
- Block writes when repo-path validation fails.
- Record every blocked path with a reason instead of writing to disk.
- Validate repo paths before every write.
