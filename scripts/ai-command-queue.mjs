#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const eventName = process.env.GITHUB_EVENT_NAME || 'manual';
const eventPath = process.env.GITHUB_EVENT_PATH || '';

if (!repo) {
  throw new Error('GITHUB_REPOSITORY is required.');
}

if (!token) {
  throw new Error('GITHUB_TOKEN is required.');
}

const [owner, repoName] = repo.split('/');
if (!owner || !repoName) {
  throw new Error(`Invalid GITHUB_REPOSITORY value: ${repo}`);
}

const apiBase = `https://api.github.com/repos/${owner}/${repoName}`;
const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'beauty-os-ai-command-queue'
};

function safeExec(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

async function api(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} ${response.statusText} for ${path}: ${text}`);
  }

  return response.json();
}

async function paginate(path, transform = (items) => items) {
  const items = [];
  for (let page = 1; page <= 10; page += 1) {
    const separator = path.includes('?') ? '&' : '?';
    const data = await api(`${path}${separator}per_page=100&page=${page}`);
    const batch = Array.isArray(data) ? data : data.items || [];
    items.push(...transform(batch));
    if (batch.length < 100) break;
  }
  return items;
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.id ?? item.number ?? item.html_url ?? JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatDate(value) {
  if (!value) return 'unknown';
  return new Date(value).toISOString();
}

function esc(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function table(headers, rows) {
  const lines = [];
  lines.push(`| ${headers.map(esc).join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of rows) {
    lines.push(`| ${row.map(esc).join(' | ')} |`);
  }
  return lines.join('\n');
}

function priorityRank(priority) {
  return { P0: 0, P1: 1, P2: 2 }[priority] ?? 3;
}

function buildPrompt(target, item) {
  const sharedRules = [
    'Do not touch secrets.',
    'Do not deploy production manually.',
    'Do not merge high-risk PRs automatically.',
    'Do not modify unrelated files.',
    'Use the smallest safe patch.',
    'Run the relevant checks for the changed surface.',
    'Open a PR when the work is done.',
    'Report changed files, tests run, risks, and rollback plan.'
  ];

  const targetRules = {
    Codex: [
      'Prefer precise code edits over broad refactors.',
      'Keep the patch scoped to the current command queue item.'
    ],
    OpenCode: [
      'Use the smallest safe patch in the repo.',
      'Keep the implementation and verification tightly scoped.'
    ],
    Claude: [
      'Explain the root cause first, then the smallest safe fix.',
      'Keep the output actionable for a human reviewer.'
    ]
  };

  return [
    `You are ${target} working on Beauty OS governance.`,
    '',
    `Priority: ${item.priority}`,
    `Action: ${item.title}`,
    `Context: ${item.detail}`,
    '',
    'Rules:',
    ...sharedRules.map((line) => `- ${line}`),
    ...(targetRules[target] || []).map((line) => `- ${line}`),
    '',
    'Expected response:',
    '1. root cause or objective',
    '2. smallest safe change',
    '3. files changed',
    '4. checks run',
    '5. remaining risk',
    '6. rollback plan'
  ].join('\n');
}

async function main() {
  const repoInfo = await api('');
  const branch = safeExec('git branch --show-current') || process.env.GITHUB_REF_NAME || 'unknown';
  const sha = safeExec('git rev-parse HEAD') || process.env.GITHUB_SHA || 'unknown';
  const dirty = safeExec('git status --short');
  const status = dirty ? 'dirty' : 'clean';
  const trigger = eventPath ? (() => {
    try {
      return JSON.parse(readFileSync(eventPath, 'utf8'));
    } catch {
      return {};
    }
  })() : {};

  const openPRs = uniqueById(await paginate('/pulls?state=open&sort=updated&direction=desc'));
  const failedRunsRaw = await paginate('/actions/runs?status=completed&per_page=100');
  const relevantWorkflows = new Set([
    'CI',
    'Smoke Tests',
    'Production Guard',
    'Production Reviewer',
    'PR Risk Review',
    'Semgrep',
    'Actionlint',
    'Production Supervisor',
    'AI Repair Dispatcher'
  ]);
  const failedWorkflowRuns = failedRunsRaw
    .filter((run) => relevantWorkflows.has(run.name) && run.conclusion === 'failure')
    .slice(0, 10)
    .map((run) => ({
      id: run.id,
      name: run.name,
      html_url: run.html_url,
      head_branch: run.head_branch,
      head_sha: run.head_sha,
      conclusion: run.conclusion,
      event: run.event,
      updated_at: run.updated_at,
      repository: run.repository?.full_name || repo
    }));

  const labelNames = [
    'ai-repair',
    'production-supervisor',
    'automation-calibrator',
    'commander:repair-needed',
    'commander:manual-review-required',
    'commander:auto-deploy-candidate'
  ];

  const issueMap = new Map();
  for (const label of labelNames) {
    const issues = await paginate(`/issues?state=open&labels=${encodeURIComponent(label)}&sort=updated&direction=desc`);
    for (const issue of issues) {
      if (!issue.pull_request) {
        issueMap.set(issue.id, {
          id: issue.id,
          number: issue.number,
          title: issue.title,
          html_url: issue.html_url,
          labels: (issue.labels || []).map((item) => item.name),
          updated_at: issue.updated_at,
          state: issue.state,
          trigger_label: label
        });
      }
    }
  }

  const activeIssues = Array.from(issueMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const queue = [];
  if (failedWorkflowRuns.length > 0) {
    const topFailure = failedWorkflowRuns[0];
    queue.push({
      priority: 'P0',
      title: `Repair failed workflow: ${topFailure.name}`,
      detail: `${topFailure.name} failed on ${topFailure.head_branch} (${topFailure.head_sha.slice(0, 7)}).`,
      url: topFailure.html_url,
      target: 'Codex'
    });
  }

  const issuePriorityOrder = [
    ['P0', ['ai-repair', 'production-supervisor', 'commander:repair-needed']],
    ['P1', ['automation-calibrator', 'commander:manual-review-required']],
    ['P2', ['commander:auto-deploy-candidate']]
  ];

  for (const [priority, labels] of issuePriorityOrder) {
    for (const label of labels) {
      const issue = activeIssues.find((item) => item.labels.includes(label));
      if (issue) {
        queue.push({
          priority,
          title: `Resolve issue #${issue.number}: ${issue.title}`,
          detail: `Issue label ${label} is still open.`,
          url: issue.html_url,
          target: priority === 'P0' ? 'Codex' : priority === 'P1' ? 'OpenCode' : 'Claude'
        });
        break;
      }
    }
    if (queue.some((item) => item.priority === priority)) break;
  }

  if (queue.length === 0 && openPRs.length > 0) {
    const pr = openPRs[0];
    queue.push({
      priority: 'P2',
      title: `Review open PR #${pr.number}: ${pr.title}`,
      detail: `Open PR updated at ${formatDate(pr.updated_at)}.`,
      url: pr.html_url,
      target: 'Claude'
    });
  }

  const highestPriorityNextAction = queue.length > 0 ? queue.slice().sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))[0] : {
    priority: 'P2',
    title: 'No actionable engineering command right now.',
    detail: 'No failed workflows, no active repair/supervisor issues, and no open PRs require immediate AI intervention.',
    url: '',
    target: 'Codex'
  };

  const promptContexts = {
    Codex: buildPrompt('Codex', highestPriorityNextAction),
    OpenCode: buildPrompt('OpenCode', highestPriorityNextAction),
    Claude: buildPrompt('Claude', highestPriorityNextAction)
  };

  const openPrRows = openPRs.slice(0, 10).map((pr) => [
    `#${pr.number}`,
    pr.title,
    pr.draft ? 'draft' : 'ready',
    formatDate(pr.updated_at),
    pr.html_url
  ]);

  const failedRunRows = failedWorkflowRuns.slice(0, 10).map((run) => [
    run.name,
    run.head_branch,
    run.head_sha.slice(0, 7),
    run.conclusion,
    formatDate(run.updated_at),
    run.html_url
  ]);

  const activeIssueRows = activeIssues.slice(0, 10).map((issue) => [
    `#${issue.number}`,
    issue.title,
    issue.labels.join(', '),
    formatDate(issue.updated_at),
    issue.html_url
  ]);

  const queueRows = queue.map((item) => [
    item.priority,
    item.title,
    item.detail,
    item.url || '-'
  ]);

  const issueBody = [
    '## AI Command Queue',
    '',
    'This issue is automatically maintained by the AI command queue workflow. It gives Codex, OpenCode, and Claude a shared, low-noise next-step packet.',
    '',
    '### Current repo status',
    '',
    table(
      ['Field', 'Value'],
      [
        ['Repository', repo],
        ['Default branch', repoInfo.default_branch || 'unknown'],
        ['Branch', branch],
        ['HEAD', sha],
        ['Working tree', status],
        ['Trigger', eventName],
        ['Trigger context', trigger.action || trigger.workflow_run?.name || trigger.issue?.title || trigger.pull_request?.title || 'unknown'],
        ['Generated at', new Date().toISOString()]
      ]
    ),
    '',
    '### Open PRs',
    '',
    openPrRows.length > 0
      ? table(['PR', 'Title', 'State', 'Updated', 'URL'], openPrRows)
      : '_No open PRs found._',
    '',
    '### Failed workflow runs',
    '',
    failedRunRows.length > 0
      ? table(['Workflow', 'Branch', 'SHA', 'Conclusion', 'Updated', 'URL'], failedRunRows)
      : '_No failed recent workflow runs found._',
    '',
    '### Active repair / supervisor issues',
    '',
    activeIssueRows.length > 0
      ? table(['Issue', 'Title', 'Labels', 'Updated', 'URL'], activeIssueRows)
      : '_No active repair or supervisor issues found._',
    '',
    '### Priority queue',
    '',
    '- `P0`: production blocker',
    '- `P1`: production hardening',
    '- `P2`: improvement',
    '',
    queueRows.length > 0
      ? table(['Priority', 'Command', 'Detail', 'Link'], queueRows)
      : '_No actionable queue items right now._',
    '',
    '### Highest-priority next action',
    '',
    `**${highestPriorityNextAction.priority}** - ${highestPriorityNextAction.title}`,
    '',
    highestPriorityNextAction.detail,
    '',
    '### Prompt for Codex',
    '',
    '```text',
    promptContexts.Codex,
    '```',
    '',
    '### Prompt for OpenCode',
    '',
    '```text',
    promptContexts.OpenCode,
    '```',
    '',
    '### Prompt for Claude',
    '',
    '```text',
    promptContexts.Claude,
    '```',
    '',
    '### Human approval gates',
    '',
    '- Human approval required before any production deploy.',
    '- Human approval required before any auto-merge of a high-risk PR.',
    '- Human approval required before any secret, env, migration, or database policy change.',
    '- Human approval required before changing workflows that can trigger production actions.',
    '',
    '### What must never be automated',
    '',
    '- Secret creation, rotation, or disclosure.',
    '- Manual production deployment.',
    '- High-risk PR merge decisions.',
    '- Any unrelated code changes outside the current queue item.',
    '- Broad refactors that are not required to fix the queue item.'
  ].join('\n');

  const report = {
    generatedAt: new Date().toISOString(),
    repository: repo,
    defaultBranch: repoInfo.default_branch || 'unknown',
    branch,
    sha,
    status,
    trigger: eventName,
    triggerContext: trigger.action || trigger.workflow_run?.name || trigger.issue?.title || trigger.pull_request?.title || 'unknown',
    openPullRequests: openPRs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      html_url: pr.html_url,
      draft: pr.draft,
      updated_at: pr.updated_at,
      labels: (pr.labels || []).map((label) => label.name)
    })),
    failedWorkflowRuns,
    activeIssues,
    priorityQueue: queue,
    highestPriorityNextAction,
    prompts: promptContexts,
    issueBody
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
