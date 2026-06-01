# AI Automation Governance

## Goal
Keep Beauty OS AI automation paused, low-cost, reviewable, and unable to pollute `main`.

## Rules
- AI automation stays paused unless explicitly re-enabled.
- Every AI output starts as a **draft PR**.
- `AI_MERGE_ALLOWED` defaults to `false`.
- `AI_SELF_REPAIR_ALLOWED` defaults to `false`.
- `AI_AUTO_ENABLED` must stay `false`.
- `AI_GOVERNANCE_ANALYZE_ONLY` is the default mode.
- `DRY_RUN=true` and `AI_GOVERNANCE_ANALYZE_ONLY=true` mean analyze and report only.
- `AI_WRITE_ALLOWED=true` is required before any file write is allowed.
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
- Before any merge candidate is considered ready, authenticated smoke must pass when `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are available. If those credentials are unavailable, the smoke test must skip explicitly and the report must say so.
- Low-risk product changes may be pushed only after lint, typecheck, unit test, build, and authenticated smoke verification have completed successfully or been explicitly skipped for missing credentials.

## Operational safety
- Prefer cheap models for simple tasks.
- Send only task description, relevant file list, selected diff, and minimal required context.
- Treat Hermes/OpenRouter as a bounded worker: it may draft patches and reports, but it may not merge, deploy, or bypass review.
- Block writes when repo-path validation fails.
- Record every blocked path with a reason instead of writing to disk.
- Validate repo paths before every write.
- Checkpoint to console or local temporary storage only; never write checkpoints into the repository.
- If a quality script is missing, mark that check as `skipped` instead of `failed`.
- Cap Groq rate-limit fallback retries to prevent infinite recursion.
