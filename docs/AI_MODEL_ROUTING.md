# AI Model Routing

## Routing policy
Use the lowest-cost model that can complete the task safely.

### Cheap tier
Use for simple, narrow tasks:
- `llama-3.1-8b-instant`
- `groq/compound-mini`

### Medium tier
Use only when the task needs more context or multi-step reasoning:
- `qwen/qwen3-32b`
- `openai/gpt-oss-20b`

### Hard tier
Use only for genuinely difficult work:
- `llama-3.3-70b-versatile`
- `openai/gpt-oss-120b`

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
