# Dependency Security Supervision

## What it checks

The Dependency Security workflow runs two layers of checks:

1. **npm audit** — Scans production dependencies (`--omit=dev`) for known
   vulnerabilities. Fails on any advisory rated **high** or **critical**.

2. **Dependency Review** (pull requests only) — Uses the official GitHub
   `dependency-review-action` to compare the dependency tree in the PR against
   the base branch. Blocks introduction of new high/critical vulnerabilities
   and comments a summary on the PR.

## When it runs

| Trigger | Scope |
| --- | --- |
| `pull_request` to `main` | npm audit + dependency review |
| `push` to `main` | npm audit only |
| Schedule — daily at 02:00 UTC | npm audit only |
| `workflow_dispatch` | npm audit + dependency review (if PR context) |

## What causes failure

- Any **high** or **critical** severity vulnerability found in production
  dependencies by `npm audit`.
- A pull request that introduces a new dependency with a **high** or
  **critical** vulnerability (detected by dependency-review-action).

## How to handle high severity advisories

1. **Identify the affected package** — The workflow output lists the advisory
   URL, affected version range, and patched version.

2. **Upgrade the dependency** — Update `package.json` to the patched version
   and run `npm install` to regenerate `package-lock.json`.

3. **Verify the fix** — Run `npm run audit:security` locally to confirm the
   advisory is resolved.

4. **Do NOT use `npm audit --ignore`** — Ignoring advisories hides real
   security risk. If a vulnerability has no available patch, document the
   risk and track it in a Linear issue.

5. **Do NOT auto-merge** — Dependency upgrades must pass the same review gates
   as any other PR.

## Why it belongs to the supervision engine

This repo uses a multi-layer supervision model:

| Layer | Workflow |
| --- | --- |
| Code quality | CI, Lint, Typecheck |
| Security | Semgrep, **Dependency Security** |
| Infrastructure | Supabase Live Health, Production Guard |
| Governance | Production Reviewer, PR Risk Review, AI Command Queue |

Dependency security is a **runtime supply-chain risk**. A vulnerability in a
production dependency can compromise the entire application regardless of how
clean the source code is. It belongs alongside Supabase Live Health and Semgrep
as part of the continuous monitoring and governance engine.

The AI Command Queue listens to this workflow so that dependency failures are
automatically surfaced as actionable commands for engineers.

## No auto-merge

This workflow is **informational and blocking only**. It does not:

- Auto-merge any PR
- Auto-deploy to production
- Override manual review requirements

All PRs still require human review before merge.

## No production deploy

This workflow runs in CI only. It never triggers a production deployment.
Production deploys are controlled by separate workflows and require explicit
human approval.
