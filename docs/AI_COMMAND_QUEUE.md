# AI Command Queue

The AI Command Queue is the repo's coordination layer for next-step engineering work.

It gathers a current snapshot of:

- open pull requests
- failed recent workflow runs
- open issues that need AI attention
- the highest-priority next action

It then maintains one fixed GitHub issue:

- `[AI Command Queue] Beauty OS Next Engineering Commands`

The workflow is read-only for code, database, and deployment surfaces. Its only write operation is updating that single issue.

## How To Use It

Codex, OpenCode, and Claude should read the command queue issue first when they need the next task.

Use it to decide:

- which workflow failure to repair first
- which production risk to inspect next
- which PR is ready for safe review
- whether a human approval gate is still required

Use the queue as an execution packet, not as a spec rewrite surface.

## Labels

### Command queue labels

- `ai-command-queue`: the fixed queue issue itself
- `automated`: maintained by workflow automation
- `ai-ready`: the queue has a fresh actionable snapshot

### Work intake labels

- `ai-repair`: workflow or automation repair needed
- `production-supervisor`: production risk needs attention
- `automation-calibrator`: workflow/tooling calibration needed
- `commander:repair-needed`: AI dispatcher should repair the current failure
- `commander:manual-review-required`: a human must review before merge or deploy
- `commander:auto-deploy-candidate`: low-risk PR that still needs normal review gates

## Human Approval Gates

Humans still must approve:

- production deploys
- high-risk PR merges
- secret, env, or credential changes
- database migrations and policy changes
- any workflow change that could trigger deployment or alter security posture

## What Must Never Be Automated

Do not automate:

- secret creation, rotation, or disclosure
- production deployment
- high-risk merge decisions
- schema or policy changes without human review
- unrelated file edits while repairing one queue item
- broad refactors that are not required for the queue item

## Practical Expectations

The command queue should keep AI work focused on the smallest safe next step.

Each generated prompt should tell the AI agent to:

- avoid unrelated files
- run only relevant checks
- report changed files, tests, risks, and rollback plan
- open a PR when the work is finished

That keeps the repo moving without making the AI re-derive the same context repeatedly.
