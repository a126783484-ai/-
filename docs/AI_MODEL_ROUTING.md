# AI Model Routing

## Routing policy
Use the lowest-cost model that can complete the task safely.

### Cheap tier
Use for simple, narrow tasks:
- `llama-3.1-8b-instant`
- `groq/compound-mini`
- `nousresearch/hermes-4-70b` through OpenRouter/Hermes worker

### Medium tier
Use only when the task needs more context or multi-step reasoning:
- `qwen/qwen3-32b`
- `openai/gpt-oss-20b`

### Hard tier
Use only for genuinely difficult work:
- `llama-3.3-70b-versatile`
- `openai/gpt-oss-120b`
- `nousresearch/hermes-4-405b` through OpenRouter, only after 70B fails or the task needs deeper reasoning

### Safety tier
Use only for prompt/risk filtering and policy checks:
- `meta-llama/llama-prompt-guard-2-22m`
- `meta-llama/llama-prompt-guard-2-86m`
- `openai/gpt-oss-safeguard-20b`

## Budget
Each round must stay within a token budget.
Simple tasks should not consume high-cost models.

Suggested budgets:
- cheap: 900 tokens
- medium: 1600 tokens
- hard: 2800 tokens
- safety: 384 tokens

## Prompt scope
Do not send the whole repo.
Only send:
- task description
- relevant file list
- selected diff
- minimum necessary context

## Escalation rules
- Product work starts cheap and only escalates when needed.
- Engine and high-risk work may require a harder tier, but never as the default for simple jobs.
- Safety checks should use the safety tier only.
- Route governance and review tasks through the cheap tier unless the task is genuinely complex.
- Keep draft PR creation and policy checks on the cheapest safe tier.
- Rate-limit fallback retries must be capped to avoid infinite recursion.

## Hermes worker role
Hermes is a low-cost execution worker, not the primary reviewer or merger.

Use Hermes for:
- reading CI/test output and summarizing next actions
- producing bounded unified diff patches for 1 task and an allowlisted file set
- drafting reports, tests, docs, and low-risk UI copy changes
- comparing expected behavior against actual browser smoke findings

Do not use Hermes for:
- pushing directly to `main`
- merging PRs
- changing secrets, auth, payment, migrations, package/dependency files, or deployment settings
- making broad architecture rewrites without human review
