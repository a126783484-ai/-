# AI Command Queue

The AI Command Queue is Beauty OS's engineering command dispatcher.

It does more than report status. It turns the current repo signal into the next concrete command for Codex, OpenCode, and Claude.

It gathers:

- open pull requests
- failed recent workflow runs
- active repair / supervisor issues
- Linear coordination metadata
- current high-priority next action

It maintains one fixed GitHub issue:

- `[AI Command Queue] Beauty OS Next Engineering Commands`

The workflow is governance-only. It must not touch app feature code, secrets, database migrations, or production deployment.

## What It Produces

The queue issue always includes:

- current repo status
- open PR list
- failed workflow list
- active repair / supervisor issues
- priority queue
- next command for Codex
- next command for OpenCode
- next command for Claude
- Linear task key and URL
- human approval required
- do-not-do list

The command engine follows this priority order:

1. Any failed workflow becomes the highest-priority repair command.
2. Any Production Guard / Supervisor P0 or P1 finding becomes a hardening command.
3. If an open PR is all green but high-risk, the command becomes human final review.
4. If an open PR is all green and low-risk, the command becomes an auto-deploy candidate only.

## How To Use It

Codex, OpenCode, and Claude should read the queue issue first when they need the next engineering instruction.

Treat the queue as an execution packet:

- follow the command that is already prioritized
- do not re-derive the same repo context repeatedly
- do not expand the scope beyond the command item

## Linear Coordination

Linear is used as the planning and status-tracking layer. GitHub remains the source of truth for CI, PR, workflow, and repository state.

The current queue task is:

- Linear issue: `JOH-8`
- URL: `https://linear.app/j26606611hn/issue/JOH-8/ai-command-queue-beauty-os-next-engineering-command`
- Team: `Johnnie`

The workflow reads optional GitHub Actions variables:

- `LINEAR_COMMAND_QUEUE_KEY`
- `LINEAR_COMMAND_QUEUE_URL`
- `LINEAR_COMMAND_QUEUE_TEAM`
- `LINEAR_COMMAND_QUEUE_STATUS`

If these variables are not configured, the script falls back to the known `JOH-8` task. No Linear token is required for the GitHub issue update path.

## Labels

### Queue labels

- `ai-command-queue`: the fixed queue issue
- `automated`: maintained by automation
- `ai-ready`: the queue has a fresh actionable command

### Command labels

- `commander:repair-needed`: a failed workflow or hardening item needs repair
- `commander:manual-review-required`: human final review is required
- `commander:auto-deploy-candidate`: low-risk PR ready for normal review gates

### Risk labels

- `risk:p0`: production blocker or highest-priority risk
- `risk:p1`: production hardening risk

### Intake labels

- `ai-repair`: workflow or automation repair needed
- `production-supervisor`: production risk needs attention
- `automation-calibrator`: workflow/tooling calibration needed

## Human Approval Gates

Humans still must approve:

- production deploys
- high-risk PR merges
- secret, env, or credential changes
- database migrations and policy changes
- workflow changes that alter security posture or deployment behavior

## What Must Never Be Automated

Do not automate:

- secret creation, rotation, or disclosure
- production deployment
- auto-merge of high-risk PRs
- schema or policy changes without human review
- unrelated file edits while repairing one queue item
- broad refactors that are not required for the queue item

## Practical Expectations

Each generated command should tell the AI agent to:

- make the smallest safe patch
- avoid unrelated files
- run only relevant checks
- report changed files, tests, risks, and rollback plan
- open a PR when the work is finished

That keeps the repo moving while still preserving human approval where it matters.
