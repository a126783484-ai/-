#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const eventName = process.env.GITHUB_EVENT_NAME || 'manual';
const eventPath = process.env.GITHUB_EVENT_PATH || '';
const linearTask = {
  key: process.env.LINEAR_COMMAND_QUEUE_KEY || 'JOH-8',
  url: process.env.LINEAR_COMMAND_QUEUE_URL || 'https://linear.app/j26606611hn/issue/JOH-8/ai-command-queue-beauty-os-next-engineering-command',
  team: process.env.LINEAR_COMMAND_QUEUE_TEAM || 'Johnnie',
  status: process.env.LINEAR_COMMAND_QUEUE_STATUS || 'Backlog'
};

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
const graphqlBase = 'https://api.github.com/graphql';
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

async function graphql(query, variables = {}) {
  const response = await fetch(graphqlBase, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub GraphQL ${response.status} ${response.statusText}: ${text}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${JSON.stringify(payload.errors)}`);
  }

  return payload.data;
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
  return { P0: 0, P1: 1, P2: 2, NONE: 3 }[priority] ?? 3;
}

function baseRules() {
  return [
    'Do not touch secrets.',
    'Do not deploy production manually.',
    'Do not merge high-risk PRs automatically.',
    'Do not modify unrelated files.',
    'Use the smallest safe patch.',
    'Run the relevant checks for the changed surface.',
    'Open a PR when the work is done.',
    'Report changed files, tests run, risks, and rollback plan.'
  ];
}

function targetRules(target) {
  const rules = {
    Codex: [
      'Prefer precise code edits over broad refactors.',
      'Keep the patch scoped to the current command queue item.'
    ],
    OpenCode: [
      'Use the smallest safe patch in the repo.',
      'Keep implementation and verification tightly scoped.'
    ],
    Claude: [
      'Explain the root cause first, then the smallest safe fix.',
      'Keep the output actionable for a human reviewer.'
    ],
    'BeautyOS-AI': [
      'You are the autonomous AI Developer running on GitHub Actions.',
      'Focus on proactive improvements and CI repairs.',
      'Ensure all code changes pass typecheck and lint before committing.',
      'Do not create duplicate PRs; check open PRs first.'
    ]
  };

  return rules[target] || [];
}

function promptEnvelope(target, command) {
  const lines = [
    `You are ${target} working on Beauty OS governance.`,
    '',
    `Priority: ${command.priority}`,
    `Command: ${command.title}`,
    `Type: ${command.kind}`,
    `Summary: ${command.summary}`,
    ''
  ];

  if (command.linearTask?.key || command.linearTask?.url) {
    lines.push(
      `Linear Task: ${command.linearTask.key || 'not configured'}`,
      `Linear URL: ${command.linearTask.url || 'not configured'}`,
      `Linear Team: ${command.linearTask.team || 'not configured'}`,
      `Linear Status: ${command.linearTask.status || 'not configured'}`,
      ''
    );
  }

  if (command.kind === 'failed-workflow') {
    lines.push(
      `Workflow: ${command.workflowName}`,
      `Run URL: ${command.runUrl}`,
      `Branch: ${command.branch}`,
      `PR: ${command.prNumber}`,
      `Repair prompt: ${command.repairPrompt}`,
      ''
    );
  } else if (command.kind === 'production-hardening') {
    lines.push(
      `Issue: #${command.issueNumber} ${command.issueTitle}`,
      `Finding: ${command.findingCode}`,
      `Risk reason: ${command.riskReason}`,
      `Files: ${command.files.join(', ') || 'unknown'}`,
      `Smallest safe patch: ${command.smallestSafePatch}`,
      ''
    );
  } else if (command.kind === 'pr-review') {
    lines.push(
      `PR: #${command.prNumber} ${command.prTitle}`,
      `PR URL: ${command.prUrl}`,
      `Risk level: ${command.riskLevel}`,
      `Checks: ${command.checkState}`,
      `Review directive: ${command.reviewDirective}`,
      ''
    );
  } else {
    lines.push(command.detail || '', '');
  }

  lines.push('Rules:');
  for (const rule of baseRules()) lines.push(`- ${rule}`);
  for (const rule of targetRules(target)) lines.push(`- ${rule}`);
  lines.push('');
  lines.push('Expected response:');
  lines.push('1. root cause or objective');
  lines.push('2. smallest safe change');
  lines.push('3. files changed');
  lines.push('4. checks run');
  lines.push('5. remaining risk');
  lines.push('6. rollback plan');
  return lines.join('\n');
}

function promptBlock(target, command) {
  return ['```text', promptEnvelope(target, command), '```'].join('\n');
}

function isHighRiskLabel(label) {
  return new Set([
    'risk:p0',
    'risk:p1',
    'risk:infra',
    'guard:blocking',
    'commander:manual-review-required'
  ]).has(label);
}

function normalizeLabels(labels = []) {
  return labels.map((label) => label.name || label).filter(Boolean);
}

function parseSupervisorFindings(issue) {
  const body = issue.body || '';
  const lines = body.split('\n');
  const findings = [];
  let current = null;

  const flush = () => {
    if (current) {
      findings.push(current);
    }
    current = null;
  };

  for (const line of lines) {
    const heading = line.match(/^####\s+(ERROR|WARN|INFO)\s+—\s+([A-Z0-9_]+)\s*$/);
    if (heading) {
      flush();
      const severity = heading[1];
      const code = heading[2];
      current = {
        severity,
        priority: severity === 'ERROR' ? 'P0' : severity === 'WARN' ? 'P1' : 'P2',
        code,
        title: '',
        description: '',
        files: [],
        suggestion: '',
        handoffPrompt: ''
      };
      continue;
    }

    if (!current) continue;

    if (!current.title && line.trim() && !line.startsWith('Files:') && !line.startsWith('Suggested action:') && !line.startsWith('AI handoff prompt:')) {
      current.title = line.trim();
      continue;
    }

    const filesMatch = line.match(/^Files:\s*(.+)$/);
    if (filesMatch) {
      current.files = filesMatch[1].split(',').map((item) => item.trim()).filter(Boolean);
      continue;
    }

    const actionMatch = line.match(/^Suggested action:\s*(.+)$/);
    if (actionMatch) {
      current.suggestion = actionMatch[1].trim();
      continue;
    }

    if (line.startsWith('AI handoff prompt:')) {
      current.capturePrompt = true;
      current.promptLines = [];
      continue;
    }

    if (current.capturePrompt) {
      if (line.startsWith('```')) {
        if (current.promptLines?.length > 0) {
          current.handoffPrompt = current.promptLines.join('\n').trim();
          current.capturePrompt = false;
          delete current.promptLines;
        }
        continue;
      }
      current.promptLines.push(line);
      continue;
    }

    if (!current.description && line.trim()) {
      current.description = line.trim();
    }
  }

  flush();

  return findings
    .filter((finding) => finding.priority === 'P0' || finding.priority === 'P1')
    .map((finding) => ({
      ...finding,
      riskReason: finding.description || finding.suggestion || finding.title || finding.code,
      smallestSafePatch: finding.handoffPrompt || finding.suggestion || `Apply the smallest safe fix for ${finding.code}.`
    }));
}

function buildFailedWorkflowCommand(run) {
  const prNumber = run.prNumber ? `#${run.prNumber}` : 'none';
  const repairPrompt = [
    `Repair the failed ${run.name} workflow.`,
    `Run URL: ${run.html_url}.`,
    `Branch: ${run.head_branch}.`,
    `PR: ${prNumber}.`,
    'Inspect the workflow logs, identify the first failing step, and fix only the smallest affected files.',
    'Do not touch unrelated files, secrets, deployment surfaces, or production config.',
    'After the fix, run the relevant checks for the changed surface and open a PR.'
  ].join(' ');

  return {
    kind: 'failed-workflow',
    priority: 'P0',
    title: `Repair failed workflow: ${run.name}`,
    summary: `${run.name} failed on ${run.head_branch} (${run.head_sha.slice(0, 7)}).`,
    detail: `${run.name} failed on ${run.head_branch} (${run.head_sha.slice(0, 7)}).`,
    workflowName: run.name,
    runUrl: run.html_url,
    branch: run.head_branch,
    prNumber,
    repairPrompt,
    url: run.html_url,
    target: 'Codex'
  };
}

function buildSupervisorCommand(issue, finding) {
  const files = finding.files.length > 0 ? finding.files : ['unknown'];
  const smallestSafePatch = finding.handoffPrompt || finding.suggestion || `Apply the smallest safe patch for ${finding.code}.`;
  const riskReason = finding.description || finding.suggestion || finding.title || finding.code;

  return {
    kind: 'production-hardening',
    priority: finding.priority,
    title: `${finding.priority} hardening: ${finding.code}`,
    summary: `${finding.priority} finding ${finding.code} in ${files.join(', ')}.`,
    detail: `${finding.priority} finding ${finding.code} in ${files.join(', ')}.`,
    issueNumber: issue.number,
    issueTitle: issue.title,
    findingCode: finding.code,
    riskReason,
    files,
    smallestSafePatch,
    url: issue.html_url,
    target: 'OpenCode'
  };
}

function buildPrCommand(pr) {
  const riskLabels = pr.labels.filter((label) => ['risk:p0', 'risk:p1', 'risk:infra', 'guard:blocking', 'commander:manual-review-required'].includes(label));
  const riskLevel = riskLabels.some((label) => ['risk:p0', 'risk:p1'].includes(label)) ? 'high-risk' : 'low-risk';
  const reviewDirective = riskLevel === 'high-risk'
    ? `Human final review required for PR #${pr.number}. Do not auto-merge.`
    : `Mark PR #${pr.number} as auto-deploy candidate only. Do not deploy production manually.`;

  return {
    kind: 'pr-review',
    priority: 'P2',
    title: `${riskLevel === 'high-risk' ? 'Review' : 'Mark'} PR #${pr.number}: ${pr.title}`,
    summary: `${riskLevel === 'high-risk' ? 'High-risk' : 'Low-risk'} PR ${pr.mergeStateStatus}/${pr.checkState} (${pr.number}).`,
    detail: `${riskLevel === 'high-risk' ? 'High-risk' : 'Low-risk'} PR ${pr.mergeStateStatus}/${pr.checkState} (${pr.number}).`,
    prNumber: pr.number,
    prTitle: pr.title,
    prUrl: pr.url,
    riskLevel,
    checkState: pr.checkState,
    reviewDirective,
    labels: riskLabels,
    url: pr.url,
    target: riskLevel === 'high-risk' ? 'Claude' : 'OpenCode'
  };
}

function buildNoopCommand() {
  return {
    kind: 'noop',
    priority: 'NONE',
    title: 'No actionable engineering command right now.',
    summary: 'No failed workflows, no active production risks, and no open PRs require immediate AI intervention.',
    detail: 'No failed workflows, no active production risks, and no open PRs require immediate AI intervention.',
    target: 'Codex',
    url: ''
  };
}

function commandKey(command) {
  return [
    command.kind,
    command.priority,
    command.title,
    command.workflowName || '',
    command.issueNumber || '',
    command.prNumber || '',
    command.url || ''
  ].join('|');
}

function attachLinearTask(command, task) {
  return {
    ...command,
    linearTask: task
  };
}

function buildCommands({ failedWorkflowRuns, supervisorFindings, openPRs }) {
  const commands = [];

  for (const run of failedWorkflowRuns.slice().sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())) {
    commands.push(buildFailedWorkflowCommand(run));
    break;
  }

  if (commands.length === 0) {
    const firstFinding = supervisorFindings
      .slice()
      .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
      .find((finding) => finding.priority === 'P0' || finding.priority === 'P1');

    if (firstFinding) {
      const issue = firstFinding.issue;
      commands.push(buildSupervisorCommand(issue, firstFinding));
    }
  }

  if (commands.length === 0) {
    const orderedPRs = openPRs
      .slice()
      .filter((pr) => !pr.isDraft)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const greenPRs = orderedPRs.filter((pr) => pr.isGreen);
    const highRiskPR = greenPRs.find((pr) => pr.labels.some(isHighRiskLabel));
    if (highRiskPR) {
      commands.push(buildPrCommand(highRiskPR));
    } else if (greenPRs.length > 0) {
      commands.push(buildPrCommand(greenPRs[0]));
    }
  }

  if (commands.length === 0) {
    commands.push(buildNoopCommand());
  }

  return commands;
}

function commandForTarget(command, target) {
  if (command.kind === 'failed-workflow') {
    const detail = [
      `Workflow: ${command.workflowName}`,
      `Run URL: ${command.runUrl}`,
      `Branch: ${command.branch}`,
      `PR: ${command.prNumber}`,
      `Repair prompt: ${command.repairPrompt}`
    ].join('\n');

    return {
      ...command,
      target,
      detail
    };
  }

  if (command.kind === 'production-hardening') {
    const detail = [
      `Issue: #${command.issueNumber} ${command.issueTitle}`,
      `Finding: ${command.findingCode}`,
      `Risk reason: ${command.riskReason}`,
      `Files: ${command.files.join(', ')}`,
      `Smallest safe patch: ${command.smallestSafePatch}`
    ].join('\n');

    return {
      ...command,
      target,
      detail
    };
  }

  if (command.kind === 'pr-review') {
    const detail = [
      `PR: #${command.prNumber} ${command.prTitle}`,
      `PR URL: ${command.prUrl}`,
      `Risk level: ${command.riskLevel}`,
      `Checks: ${command.checkState}`,
      `Review directive: ${command.reviewDirective}`
    ].join('\n');

    return {
      ...command,
      target,
      detail
    };
  }

  return {
    ...command,
    target,
    detail: command.detail || command.summary
  };
}

function determineIssueLabels({ commands, supervisorFindings, openPRs }) {
  const labels = new Set(['ai-command-queue', 'automated', 'ai-ready']);
  const top = commands[0] || buildNoopCommand();

  if (top.kind === 'failed-workflow' || top.kind === 'production-hardening') {
    labels.add('commander:repair-needed');
  }

  if (top.kind === 'production-hardening') {
    if (top.priority === 'P0') labels.add('risk:p0');
    if (top.priority === 'P1') labels.add('risk:p1');
  }

  if (top.kind === 'pr-review') {
    if (top.riskLevel === 'high-risk') {
      labels.add('commander:manual-review-required');
      for (const label of top.labels || []) {
        if (label === 'risk:p0' || label === 'risk:p1') {
          labels.add(label);
        }
      }
    } else {
      labels.add('commander:auto-deploy-candidate');
    }
  }

  for (const finding of supervisorFindings) {
    if (finding.priority === 'P0') labels.add('risk:p0');
    if (finding.priority === 'P1') labels.add('risk:p1');
  }

  const highRiskPrExists = openPRs.some((pr) => !pr.isDraft && pr.isGreen && pr.labels.some(isHighRiskLabel));
  const lowRiskGreenPrExists = openPRs.some((pr) => !pr.isDraft && pr.isGreen && !pr.labels.some(isHighRiskLabel));

  if (!labels.has('commander:repair-needed') && !labels.has('commander:manual-review-required') && !labels.has('commander:auto-deploy-candidate')) {
    if (highRiskPrExists) {
      labels.add('commander:manual-review-required');
    } else if (lowRiskGreenPrExists) {
      labels.add('commander:auto-deploy-candidate');
    }
  }

  return Array.from(labels);
}

async function fetchOpenPullRequests() {
  const data = await graphql(`
    query($owner: String!, $name: String!) {
      repository(owner: $owner, name: $name) {
        pullRequests(first: 25, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes {
            number
            title
            url
            isDraft
            updatedAt
            headRefName
            headRefOid
            mergeStateStatus
            mergeable
            reviewDecision
            labels(first: 20) {
              nodes {
                name
              }
            }
            statusCheckRollup {
              state
            }
          }
        }
      }
    }
  `, { owner, name: repoName });

  return (data.repository.pullRequests.nodes || []).map((node) => ({
    number: node.number,
    title: node.title,
    url: node.url,
    isDraft: node.isDraft,
    updatedAt: node.updatedAt,
    headBranch: node.headRefName,
    headSha: node.headRefOid,
    mergeStateStatus: node.mergeStateStatus,
    mergeable: node.mergeable,
    reviewDecision: node.reviewDecision,
    checkState: node.statusCheckRollup?.state || 'UNKNOWN',
    isGreen: node.statusCheckRollup?.state === 'SUCCESS' && node.mergeStateStatus === 'CLEAN',
    labels: normalizeLabels(node.labels?.nodes || [])
  }));
}

async function main() {
  const repoInfo = await api('');
  const branch = safeExec('git branch --show-current') || process.env.GITHUB_REF_NAME || 'unknown';
  const sha = safeExec('git rev-parse HEAD') || process.env.GITHUB_SHA || 'unknown';
  const dirty = safeExec('git status --short');
  const status = dirty ? 'dirty' : 'clean';
  const trigger = eventPath
    ? (() => {
        try {
          return JSON.parse(readFileSync(eventPath, 'utf8'));
        } catch {
          return {};
        }
      })()
    : {};

  const openPRs = uniqueById(await fetchOpenPullRequests());

  const failedRunsRaw = await paginate('/actions/runs?status=completed');
  const relevantWorkflows = new Set([
    'CI',
    'Smoke Tests',
    'Production Guard',
    'PR Governance',
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
      prNumber: run.pull_requests?.[0]?.number || null,
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
      if (issue.pull_request) continue;
      issueMap.set(issue.id, {
        id: issue.id,
        number: issue.number,
        title: issue.title,
        html_url: issue.html_url,
        labels: normalizeLabels(issue.labels || []),
        updated_at: issue.updated_at,
        state: issue.state,
        trigger_label: label,
        body: issue.body || ''
      });
    }
  }

  const activeIssues = Array.from(issueMap.values()).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const supervisorIssues = activeIssues
    .filter((issue) => normalizeLabels(issue.labels).includes('production-supervisor') || normalizeLabels(issue.labels).includes('production-guard'));

  const supervisorFindings = [];
  for (const issue of supervisorIssues) {
    const findings = parseSupervisorFindings(issue).map((finding) => ({
      ...finding,
      issue
    }));
    supervisorFindings.push(...findings);
  }

  const commands = buildCommands({ failedWorkflowRuns, supervisorFindings, openPRs });
  const highestPriorityNextAction = attachLinearTask(commands[0] || buildNoopCommand(), linearTask);
  const issueLabels = determineIssueLabels({ commands, supervisorFindings, openPRs });

  const codexCommand = commandForTarget(highestPriorityNextAction, 'Codex');
  const openCodeCommand = commandForTarget(highestPriorityNextAction, 'OpenCode');
  const claudeCommand = commandForTarget(highestPriorityNextAction, 'Claude');
  const beautyOsAiCommand = commandForTarget(highestPriorityNextAction, 'BeautyOS-AI');

  const promptContexts = {
    Codex: promptEnvelope('Codex', codexCommand),
    OpenCode: promptEnvelope('OpenCode', openCodeCommand),
    Claude: promptEnvelope('Claude', claudeCommand),
    'BeautyOS-AI': promptEnvelope('BeautyOS-AI', beautyOsAiCommand)
  };

  const openPrRows = openPRs.slice(0, 10).map((pr) => [
    `#${pr.number}`,
    pr.title,
    pr.isDraft ? 'draft' : pr.isGreen ? 'green' : 'pending',
    pr.mergeStateStatus,
    pr.checkState,
    formatDate(pr.updatedAt),
    pr.url
  ]);

  const failedRunRows = failedWorkflowRuns.slice(0, 10).map((run) => [
    run.name,
    run.head_branch,
    run.head_sha.slice(0, 7),
    run.conclusion,
    run.prNumber ? `#${run.prNumber}` : 'none',
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

  const priorityQueueRows = commands.map((command) => [
    command.priority,
    command.kind,
    command.title,
    command.summary,
    linearTask.key && linearTask.url ? `[${linearTask.key}](${linearTask.url})` : 'not configured',
    command.url || '-'
  ]);

  const highestPriorityLabel = highestPriorityNextAction.kind === 'noop'
    ? 'NONE'
    : highestPriorityNextAction.priority;

  const humanApprovalLines = [];
  if (issueLabels.includes('commander:repair-needed')) {
    humanApprovalLines.push('Human approval required before any production deploy or merge of the repaired surface.');
  }
  if (issueLabels.includes('commander:manual-review-required')) {
    humanApprovalLines.push('Human final review required before merge. Do not auto-merge or auto-deploy.');
  }
  if (issueLabels.includes('commander:auto-deploy-candidate')) {
    humanApprovalLines.push('Human approval still required before any production deploy. This is only a candidate.');
  }
  if (issueLabels.includes('risk:p0') || issueLabels.includes('risk:p1')) {
    humanApprovalLines.push('Human review required before changing production-risk code, workflows, secrets, or security posture.');
  }
  if (humanApprovalLines.length === 0) {
    humanApprovalLines.push('No additional human gate is required beyond normal review discipline.');
  }

  const doNotDoLines = [
    'Do not touch secrets.',
    'Do not deploy production manually.',
    'Do not merge high-risk PRs automatically.',
    'Do not modify unrelated files.',
    'Do not widen the patch beyond the queue item.',
    'Do not change migrations, Supabase SQL, or production env in this governance workflow.'
  ];

  const issueBody = [
    '## AI Command Queue',
    '',
    'This issue is automatically maintained by the AI command queue workflow. It now generates the next engineering command, not just a status snapshot.',
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
      ? table(['PR', 'Title', 'State', 'Merge state', 'Checks', 'Updated', 'URL'], openPrRows)
      : '_No open PRs found._',
    '',
    '### Failed workflow runs',
    '',
    failedRunRows.length > 0
      ? table(['Workflow', 'Branch', 'SHA', 'Conclusion', 'PR', 'Updated', 'URL'], failedRunRows)
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
    priorityQueueRows.length > 0
      ? table(['Priority', 'Type', 'Command', 'Summary', 'Linear', 'Link'], priorityQueueRows)
      : '_No actionable queue items right now._',
    '',
    '### Linear coordination',
    '',
    table(
      ['Field', 'Value'],
      [
        ['Linear task', linearTask.key || 'not configured'],
        ['Linear URL', linearTask.url || 'not configured'],
        ['Linear team', linearTask.team || 'not configured'],
        ['Linear status', linearTask.status || 'not configured']
      ]
    ),
    '',
    '### Highest-priority next action',
    '',
    `**${highestPriorityLabel}** - ${highestPriorityNextAction.title}`,
    '',
    highestPriorityNextAction.summary,
    '',
    '### Next command for Codex',
    '',
    promptBlock('Codex', codexCommand),
    '',
    '### Next command for OpenCode',
    '',
    promptBlock('OpenCode', openCodeCommand),
    '',
    '### Next command for Claude',
    '',
    promptBlock('Claude', claudeCommand),
    '',
    '### Next command for BeautyOS-AI (Groq)',
    '',
    promptBlock('BeautyOS-AI', beautyOsAiCommand),
    '',
    '### Human approval required',
    '',
    ...humanApprovalLines.map((line) => `- ${line}`),
    '',
    '### Do-not-do list',
    '',
    ...doNotDoLines.map((line) => `- ${line}`)
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
      url: pr.url,
      isDraft: pr.isDraft,
      updatedAt: pr.updatedAt,
      labels: pr.labels,
      mergeStateStatus: pr.mergeStateStatus,
      checkState: pr.checkState,
      isGreen: pr.isGreen
    })),
    failedWorkflowRuns,
    activeIssues,
    supervisorFindings,
    priorityQueue: commands,
    highestPriorityNextAction,
    linearTask,
    nextCommands: {
      Codex: codexCommand,
      OpenCode: openCodeCommand,
      Claude: claudeCommand,
      'BeautyOS-AI': beautyOsAiCommand
    },
    issueLabels,
    issueBody
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
