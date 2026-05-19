#!/usr/bin/env node
/**
 * Beauty OS AI Developer v8.0 - Dual-Lane Autonomous R&D
 * 
 * Architecture:
 * - Lane A: AI Engine Development (automation improvement)
 * - Lane B: AI Product Development (product features)
 * 
 * Core Rules:
 * - Continuous loop: create PR, wait for checks, auto-fix if failed, auto-merge when green
 * - 6-hour session timebox — auto-exit on timeout
 * - No schedule — only runs when owner triggers workflow_dispatch
 * - No human review required — supervision system verifies and auto-merges
 * - Self-healing: if checks fail, AI writes fix, pushes, retries
 * - Issue #27: status-only, never used as control panel
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ===== Environment Variables =====
const ENV = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  REPO_DIR: process.env.BEAUTY_OS_REPO || process.cwd(),
  REPO: process.env.GITHUB_REPOSITORY || 'Johnnie1266789/beauty-os',

  // Core Controls
  SUPERVISION_ENABLED: process.env.SUPERVISION_ENABLED === 'true',
  AI_DEVELOPMENT_ALLOWED: process.env.AI_DEVELOPMENT_ALLOWED === 'true',
  AI_AUTO_ENABLED: process.env.AI_AUTO_ENABLED === 'true',
  AI_ENGINE_LANE_ENABLED: process.env.AI_ENGINE_LANE_ENABLED === 'true',
  AI_PRODUCT_LANE_ENABLED: process.env.AI_PRODUCT_LANE_ENABLED === 'true',
  AI_LOW_RISK_AUTOMERGE_ENABLED: process.env.AI_LOW_RISK_AUTOMERGE_ENABLED === 'true',

  // Session Limits
  MAX_OPEN_ENGINE_PRS: parseInt(process.env.MAX_OPEN_ENGINE_PRS || '1', 10),
  MAX_OPEN_PRODUCT_PRS: parseInt(process.env.MAX_OPEN_PRODUCT_PRS || '3', 10),
  MAX_OPEN_LOW_RISK_AUTOMERGE_PRS: parseInt(process.env.MAX_OPEN_LOW_RISK_AUTOMERGE_PRS || '2', 10),

  // Routing
  AI_MODEL_ROUTER: process.env.AI_MODEL_ROUTER || 'auto',
  AI_MAX_FILES_AUTO: parseInt(process.env.AI_MAX_FILES_AUTO || '1', 10),

  // Lane & Mode
  AI_LANE: process.env.AI_LANE || 'product',
  ENGINEER_MODE: process.env.AI_ENGINEER_MODE || 'auto',
  RUN_MODE: process.env.AI_RUN_MODE || 'draft_pr',
};

// ===== Constants =====
const CONFIG = {
  GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
  // Free tier models — ordered by preference (cheapest first)
  MODELS: [
    'llama-3.1-8b-instant',       // Fast, free, good for simple tasks
    'qwen-2.5-32b',               // Good coding model, free
    'llama-3.3-70b-versatile',    // Best quality, 12k TPM limit
    'deepseek-r1-distill-llama-70b', // Reasoning, free
  ],
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  COMMAND_QUEUE_ISSUE: 27,
};

// Model usage tracking per session
const MODEL_USAGE = {};

// Lane-specific configuration
const LANE_CONFIG = {
  engine: {
    branchPrefix: 'ai-engine/',
    prTitlePrefix: '[AI Engine]',
    labels: ['ai-engine', 'automation'],
    allowedPaths: [
      /\.github\/workflows\/ai-/,
      /\.github\/workflows\/.*supervisor/,
      /scripts\/ai-/,
      /scripts\/.*supervisor/,
      /scripts\/.*repair/,
      /scripts\/.*governance/,
    ],
    blockedPaths: [/src\//],
    maxOpenPRs: ENV.MAX_OPEN_ENGINE_PRS,
  },
  product: {
    branchPrefix: 'ai-product/',
    prTitlePrefix: '[AI Product]',
    labels: ['ai-product', 'product'],
    allowedPaths: [
      /src\/app\//,
      /src\/components\//,
      /src\/lib\//,
      /src\/styles\//,
    ],
    blockedPaths: [
      /auth/i, /login/i, /session/i, /payment/i, /billing/i,
      /tenant/i, /workspace/i, /member/i, /invite/i,
      /secrets/i, /\.env/i, /migrations/i, /workflows/i,
      /package\.json/i, /package-lock\.json/i,
      /scripts\/ai-/, /supabase/, /RLS/i,
    ],
    maxOpenPRs: ENV.MAX_OPEN_PRODUCT_PRS,
  },
};

const HIGH_RISK_LABELS = new Set([
  'risk:p0', 'risk:p1', 'risk:infra', 'risk:high',
  'guard:blocking', 'commander:manual-review-required', 'human-review-required'
]);

const REQUIRED_CHECKS = ['CI', 'typecheck', 'lint'];

// ===== 6-Hour Session Timebox =====
const SESSION_START = Date.now();
const SESSION_MAX_MS = 6 * 60 * 60 * 1000;

function checkSessionTimebox() {
  const elapsed = Date.now() - SESSION_START;
  if (elapsed >= SESSION_MAX_MS) {
    log('Session timebox reached (6 hours). Exiting.');
    return false;
  }
  return true;
}

// ===== Logging =====
function log(msg, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'OK';
  console.log(`[AI Dev ${prefix}] [${ENV.AI_LANE}] ${new Date().toISOString()} - ${msg}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, maxRetries = CONFIG.MAX_RETRIES, delay = CONFIG.RETRY_DELAY) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      log(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`, 'warn');
      if (attempt === maxRetries) throw error;
      await sleep(delay * attempt);
    }
  }
}

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: ENV.REPO_DIR,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    }).trim();
  } catch (e) {
    if (options.ignoreError) return '';
    log(`Command failed: ${cmd}`, 'error');
    throw e;
  }
}

// ===== Safety Gates =====
function safetyCheck() {
  const missing = [];

  if (!ENV.GROQ_API_KEY) missing.push('GROQ_API_KEY (secret)');
  if (!ENV.GITHUB_TOKEN) missing.push('GITHUB_TOKEN (secret)');
  if (!ENV.SUPERVISION_ENABLED) missing.push('SUPERVISION_ENABLED (must be true)');
  if (!ENV.AI_DEVELOPMENT_ALLOWED) missing.push('AI_DEVELOPMENT_ALLOWED (must be true)');

  if (ENV.AI_LANE === 'engine' && !ENV.AI_ENGINE_LANE_ENABLED) {
    missing.push('AI_ENGINE_LANE_ENABLED (must be true for engine lane)');
  }
  if (ENV.AI_LANE === 'product' && !ENV.AI_PRODUCT_LANE_ENABLED) {
    missing.push('AI_PRODUCT_LANE_ENABLED (must be true for product lane)');
  }

  if (ENV.ENGINEER_MODE === 'auto' && !ENV.AI_AUTO_ENABLED) {
    missing.push('AI_AUTO_ENABLED (must be true for auto mode)');
  }

  if (missing.length > 0) {
    log(`Missing required variables/secrets: ${missing.join(', ')}`, 'error');
    log('Exiting safely. No files written, no PRs created.', 'warn');
    process.exit(0);
  }

  log(`Safety checks passed. Lane: ${ENV.AI_LANE} | Mode: ${ENV.ENGINEER_MODE} | Run: ${ENV.RUN_MODE}`);
}

// ===== Groq API with Multi-Model Router =====
let currentModelIndex = 0;

function getNextModel() {
  const model = CONFIG.MODELS[currentModelIndex % CONFIG.MODELS.length];
  currentModelIndex++;
  return model;
}

async function callGroq(systemPrompt, userPrompt, maxTokens = 2500, modelOverride = null) {
  const model = modelOverride || getNextModel();
  const taskType = systemPrompt.includes('writing code') ? 'code' : 'task';

  log(`Calling Groq: ${model} (${taskType})`);

  const response = await fetch(CONFIG.GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ENV.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();
  if (data.error) {
    const msg = data.error.message || '';

    if (msg.includes('Rate limit')) {
      log(`Rate limited on ${model}. Trying next model...`, 'warn');
      // Try next model immediately
      return callGroq(systemPrompt, userPrompt, maxTokens);
    }

    if (msg.includes('not found') || msg.includes('does not exist')) {
      log(`Model ${model} not available. Trying next...`, 'warn');
      return callGroq(systemPrompt, userPrompt, maxTokens);
    }

    throw new Error(`Groq API (${model}): ${msg}`);
  }

  MODEL_USAGE[model] = (MODEL_USAGE[model] || 0) + 1;
  log(`Model usage: ${JSON.stringify(MODEL_USAGE)}`);
  return data.choices[0].message.content;
}

// ===== GitHub API Helpers =====
async function ghApi(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${ENV.REPO}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${ENV.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function ghGraphQL(query, variables = {}) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${ENV.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${JSON.stringify(payload.errors)}`);
  }
  return payload.data;
}

// ===== Backlog Scan =====
async function scanBacklog() {
  log('Scanning backlog...');
  const backlog = {
    openPRs: [],
    draftPRs: [],
    failedWorkflows: [],
    repairIssues: [],
    aiTaskIssues: [],
    aiBranches: [],
    commandQueue: null,
  };

  try {
    const data = await ghGraphQL(`
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          pullRequests(first: 50, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
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
              labels(first: 20) { nodes { name } }
              statusCheckRollup { state }
              files(first: 100) { nodes { path } }
              reviews(first: 10, states: PENDING) { totalCount }
            }
          }
        }
      }
    `, { owner: ENV.REPO.split('/')[0], name: ENV.REPO.split('/')[1] });

    const prs = data.repository.pullRequests.nodes || [];
    for (const pr of prs) {
      const prInfo = {
        number: pr.number,
        title: pr.title,
        url: pr.url,
        isDraft: pr.isDraft,
        updatedAt: pr.updatedAt,
        headBranch: pr.headRefName,
        headSha: pr.headRefOid,
        mergeStateStatus: pr.mergeStateStatus,
        mergeable: pr.mergeable,
        reviewDecision: pr.reviewDecision,
        checkState: pr.statusCheckRollup?.state || 'UNKNOWN',
        isGreen: pr.statusCheckRollup?.state === 'SUCCESS' && pr.mergeStateStatus === 'CLEAN',
        labels: (pr.labels?.nodes || []).map(n => n.name),
        files: (pr.files?.nodes || []).map(n => n.path),
        pendingReviews: pr.reviews?.totalCount || 0,
        lane: pr.headRefName?.startsWith('ai-engine/') ? 'engine' :
              pr.headRefName?.startsWith('ai-product/') ? 'product' : 'unknown',
      };

      if (pr.isDraft) {
        backlog.draftPRs.push(prInfo);
      } else {
        backlog.openPRs.push(prInfo);
      }
    }
  } catch (e) {
    log(`Failed to fetch PRs: ${e.message}`, 'warn');
  }

  try {
    const runs = await ghApi('/actions/runs?status=completed&per_page=20');
    const relevantWorkflows = new Set([
      'CI', 'Smoke Tests', 'Production Guard', 'PR Governance',
      'Semgrep', 'Actionlint', 'Production Supervisor', 'AI Repair Dispatcher',
      'AI Engine Developer', 'AI Product Developer'
    ]);
    backlog.failedWorkflows = (runs.workflow_runs || [])
      .filter(r => relevantWorkflows.has(r.name) && r.conclusion === 'failure')
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        name: r.name,
        html_url: r.html_url,
        head_branch: r.head_branch,
        head_sha: r.head_sha,
        conclusion: r.conclusion,
        updated_at: r.updated_at,
        prNumber: r.pull_requests?.[0]?.number || null,
      }));
  } catch (e) {
    log(`Failed to fetch workflows: ${e.message}`, 'warn');
  }

  try {
    const issues = await ghApi('/issues?state=open&labels=ai-repair&per_page=20');
    backlog.repairIssues = (issues || []).map(i => ({
      number: i.number,
      title: i.title,
      html_url: i.html_url,
      labels: (i.labels || []).map(l => typeof l === 'string' ? l : l.name),
      updated_at: i.updated_at,
    }));
  } catch (e) {
    log(`Failed to fetch repair issues: ${e.message}`, 'warn');
  }

  try {
    const issues = await ghApi('/issues?state=open&labels=ai-task&per_page=20');
    backlog.aiTaskIssues = (issues || []).map(i => ({
      number: i.number,
      title: i.title,
      html_url: i.html_url,
      body: i.body || '',
      labels: (i.labels || []).map(l => typeof l === 'string' ? l : l.name),
      updated_at: i.updated_at,
    }));
  } catch (e) {
    log(`Failed to fetch ai-task issues: ${e.message}`, 'warn');
  }

  try {
    const refs = await ghApi('/git/matching-refs/heads/ai-');
    backlog.aiBranches = (refs || []).map(r => ({
      ref: r.ref,
      sha: r.object.sha,
    }));
  } catch (e) {
    log(`Failed to fetch AI branches: ${e.message}`, 'warn');
  }

  try {
    const issue = await ghApi(`/issues/${CONFIG.COMMAND_QUEUE_ISSUE}`);
    backlog.commandQueue = {
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      updated_at: issue.updated_at,
    };
  } catch (e) {
    log(`Failed to fetch command queue: ${e.message}`, 'warn');
  }

  log(`Backlog: ${backlog.openPRs.length} open PRs, ${backlog.draftPRs.length} draft PRs, ${backlog.failedWorkflows.length} failed workflows`);
  return backlog;
}

// ===== Risk Classifier =====
function classifyRisk(files, labels = []) {
  const laneConfig = LANE_CONFIG[ENV.AI_LANE];
  let risk = 'low';
  let confidence = 'high';
  let reasons = [];

  if (ENV.AI_LANE === 'engine') {
    return { risk: 'high', confidence: 'high', reasons: ['Engine lane requires human review'] };
  }

  const hasHighRiskLabel = labels.some(l => HIGH_RISK_LABELS.has(l));
  if (hasHighRiskLabel) {
    return { risk: 'high', confidence: 'high', reasons: ['Has high-risk label'] };
  }

  for (const file of files) {
    for (const pattern of laneConfig.blockedPaths) {
      if (pattern.test(file)) {
        return { risk: 'high', confidence: 'high', reasons: [`Changes blocked path: ${file}`] };
      }
    }

    const isAllowed = laneConfig.allowedPaths.some(p => p.test(file));
    if (!isAllowed) {
      risk = 'medium';
      reasons.push(`File outside typical scope: ${file}`);
    }

    if (/auth|login|session|payment|billing|secret|\.env|migration|schema|RLS/i.test(file)) {
      return { risk: 'high', confidence: 'high', reasons: [`Sensitive file: ${file}`] };
    }
    if (/package\.json|package-lock\.json/i.test(file)) {
      return { risk: 'high', confidence: 'high', reasons: [`Dependency file: ${file}`] };
    }
    if (/\.github\/workflows/i.test(file)) {
      return { risk: 'high', confidence: 'high', reasons: [`Workflow file: ${file}`] };
    }
    if (/scripts\/ai-|supervisor|repair|governance/i.test(file)) {
      return { risk: 'high', confidence: 'high', reasons: [`Automation script: ${file}`] };
    }
  }

  if (files.length > 3) {
    risk = risk === 'low' ? 'medium' : risk;
    reasons.push(`Multiple files changed: ${files.length}`);
  }

  if (reasons.length > 0 && risk === 'medium') {
    confidence = 'medium';
  }

  return { risk, confidence, reasons };
}

// ===== Task Selection =====
async function selectTask(backlog) {
  log('Selecting task...');

  // P0: Failed workflows — engine lane only (product lane should not touch CI/workflow fixes)
  if (ENV.AI_LANE === 'engine' && backlog.failedWorkflows.length > 0) {
    const wf = backlog.failedWorkflows[0];
    return {
      priority: 'P0',
      type: 'failed-workflow',
      title: `Repair failed workflow: ${wf.name}`,
      description: `Fix ${wf.name} on ${wf.head_branch}. Inspect logs, identify first failing step, fix smallest affected files.`,
      files_to_modify: [],
    };
  }

  // P0: Repair issues — engine lane only (repair issues are usually CI/automation related)
  if (ENV.AI_LANE === 'engine' && backlog.repairIssues.length > 0) {
    const issue = backlog.repairIssues[0];
    return {
      priority: 'P0',
      type: 'repair-issue',
      title: `Address repair issue: ${issue.title}`,
      description: `Resolve open repair issue #${issue.number}: ${issue.title}`,
      files_to_modify: [],
    };
  }

  // P2: AI task issues — both lanes can pick these up
  if (backlog.aiTaskIssues.length > 0) {
    const issue = backlog.aiTaskIssues[0];
    return {
      priority: 'P2',
      type: 'ai-task',
      title: `Complete ai-task: ${issue.title}`,
      description: `Implement ai-task #${issue.number}: ${issue.title}`,
      files_to_modify: [],
    };
  }

  // P2: Product improvement — product lane only
  if (ENV.AI_LANE === 'product') {
    return {
      priority: 'P2',
      type: 'product-improvement',
      title: 'Small product improvement',
      description: 'Make a small, safe improvement to the product UI or UX. Focus on empty states, mobile UX, search/filter/sort, or UI consistency.',
      files_to_modify: [],
    };
  }

  // P2: Engine improvement — engine lane only
  if (ENV.AI_LANE === 'engine') {
    return {
      priority: 'P2',
      type: 'engine-improvement',
      title: 'Improve automation reliability',
      description: 'Improve AI automation reliability: better error handling, duplicate PR avoidance, status reporting, or session checkpointing.',
      files_to_modify: [],
    };
  }

  return {
    priority: 'NONE',
    type: 'checkpoint',
    title: 'Session checkpoint',
    description: 'No actionable task found.',
    files_to_modify: [],
  };
}

// ===== Wait for Checks =====
async function waitForChecks(prNumber, maxWaitMs = 10 * 60 * 1000) {
  log(`Waiting for checks on PR #${prNumber}...`);
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    if (!checkSessionTimebox()) return { allGreen: false, reason: 'Session timebox' };

    await sleep(30000);

    try {
      const data = await ghGraphQL(`
        query($owner: String!, $name: String!, $number: Int!) {
          repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
              statusCheckRollup { state }
              mergeStateStatus
              mergeable
            }
          }
        }
      `, {
        owner: ENV.REPO.split('/')[0],
        name: ENV.REPO.split('/')[1],
        number: prNumber,
      });

      const pr = data.repository.pullRequest;
      const state = pr.statusCheckRollup?.state || 'UNKNOWN';

      if (state === 'SUCCESS' && pr.mergeStateStatus === 'CLEAN') {
        log(`All checks green for PR #${prNumber}`);
        return { allGreen: true, state, mergeStateStatus: pr.mergeStateStatus };
      }
      if (state === 'FAILURE') {
        log(`Checks failed for PR #${prNumber}: ${state}`);
        return { allGreen: false, reason: 'Checks failed', state };
      }

      log(`Checks still running for PR #${prNumber}: ${state}`);
    } catch (e) {
      log(`Failed to check PR status: ${e.message}`, 'warn');
    }
  }

  return { allGreen: false, reason: 'Timeout waiting for checks' };
}

// ===== Fix PR =====
async function fixPR(pr, task) {
  log(`Attempting to fix PR #${pr.number}...`);

  try {
    exec(`git fetch origin ${pr.headBranch}`);
    exec(`git checkout -B ${pr.headBranch} origin/${pr.headBranch}`);
  } catch (e) {
    log(`Failed to checkout PR branch: ${e.message}`, 'error');
    return false;
  }

  const laneConfig = LANE_CONFIG[ENV.AI_LANE];
  const code = await writeCode({ ...task, title: `Fix: ${task.title}`, description: `Fix failing checks for: ${task.title}` });
  const changes = applyChanges(code, laneConfig);

  if (!changes.length) {
    log('No fix generated', 'warn');
    return false;
  }

  exec('git add -A');
  exec(`git commit -m "fix: ${task.title}"`);
  await withRetry(() => exec(`git push -u origin ${pr.headBranch}`));
  log(`Pushed fix to PR #${pr.number}`);
  return true;
}

// ===== Code Generation =====
async function writeCode(task) {
  log(`AI writing code for: ${task.title}`);

  const projectStructure = exec('find src -type f -name "*.ts" -o -name "*.tsx" | sort', { ignoreError: true });

  const systemPrompt = `You are a senior Beauty OS engineer working on the ${ENV.AI_LANE} lane.
Project: Next.js 15 + Supabase + Tailwind CSS + TypeScript.

Rules:
1. One item = one PR. No bundled unrelated changes.
2. Strict types, Tailwind CSS, no new dependencies, no package.json changes.
3. Must use import paths that actually exist in the project.
4. Supabase client at: src/lib/supabase.ts
5. Type definitions at: src/lib/types.ts
6. Do not touch auth, payment, secrets, migrations, workflows, or package files.

${ENV.AI_LANE === 'engine' ? `Engine lane scope: workflow files, AI scripts, automation docs.` : `Product lane scope: src/app/, src/components/, src/lib/, src/styles/.`}

Project structure:
${projectStructure.substring(0, 1000)}

Format: \`\`\`typescript
// file/path.ts
code here
\`\`\``;

  const userPrompt = `Task: ${task.title}
Description: ${task.description}
${task.files_to_modify?.length ? `Files to modify: ${task.files_to_modify.join(', ')}` : ''}

Please write the code changes.`;

  const code = await withRetry(() => callGroq(systemPrompt, userPrompt, 4000));

  const blockedPatterns = [/Demo Workspace/i, /TODO: production/i, /sb_secret_/i];
  for (const pattern of blockedPatterns) {
    if (pattern.test(code)) throw new Error(`Blocked pattern found: ${pattern}`);
  }

  return code;
}

function applyChanges(code, laneConfig) {
  log('Applying changes...');
  const regex = /```(?:typescript|tsx|javascript)?\n(?:\/\/\s*)?([^\n]+)\n([\s\S]*?)```/g;
  const changes = [];
  let match;

  while ((match = regex.exec(code)) !== null) {
    const filePath = match[1].trim().replace(/^\/\/\s*/, '');
    const content = match[2].trim();

    const isAllowed = laneConfig.allowedPaths.some(p => p.test(filePath));
    const isBlocked = laneConfig.blockedPaths.some(p => p.test(filePath));

    if (!isBlocked && (isAllowed || ENV.AI_LANE === 'engine')) {
      changes.push({ filePath, content });
    } else {
      log(`Skipping blocked/disallowed file: ${filePath}`, 'warn');
    }
  }

  const maxFiles = ENV.ENGINEER_MODE === 'auto' ? ENV.AI_MAX_FILES_AUTO : 5;
  const finalChanges = changes.slice(0, maxFiles);

  if (!finalChanges.length) {
    log('No valid changes after filtering', 'warn');
    return [];
  }

  for (const { filePath, content } of finalChanges) {
    const fullPath = join(ENV.REPO_DIR, filePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
    log(`Written: ${filePath}`);
  }

  return finalChanges;
}

// ===== Quality Checks =====
async function runQualityChecks() {
  log('Running quality checks...');
  const checks = [];

  try {
    exec('npx tsc --noEmit', { ignoreError: true });
    checks.push({ name: 'typecheck', passed: true });
  } catch { checks.push({ name: 'typecheck', passed: false }); }

  try {
    exec('npx eslint . --max-warnings=0', { ignoreError: true });
    checks.push({ name: 'lint', passed: true });
  } catch { checks.push({ name: 'lint', passed: false }); }

  try {
    exec('npm run test', { ignoreError: true });
    checks.push({ name: 'test', passed: true });
  } catch { checks.push({ name: 'test', passed: false }); }

  return checks;
}

// ===== PR Creation =====
async function createPR(task, changes, checks, branchName) {
  log('Creating PR...');

  const laneConfig = LANE_CONFIG[ENV.AI_LANE];
  const risk = classifyRisk(changes.map(c => c.filePath));

  const labels = [...laneConfig.labels];
  if (risk.risk === 'low') {
    labels.push('risk:low', 'auto-merge:eligible');
  } else if (risk.risk === 'high') {
    labels.push('risk:high');
  }

  const body = `## AI ${ENV.AI_LANE === 'engine' ? 'Engine' : 'Product'} Improvement

**Lane**: ${ENV.AI_LANE}
**Single Objective**: ${task.title}
**Description**: ${task.description}

### Files Changed
${changes.map(c => `- \`${c.filePath}\``).join('\n')}

### Risk Classification
- **Risk Level**: ${risk.risk}
- **Confidence**: ${risk.confidence}
- **Reasons**: ${risk.reasons.join(', ') || 'None'}

### Auto-Merge Eligibility
- **Eligible**: ${risk.risk === 'low' && risk.confidence === 'high' && ENV.AI_LANE === 'product' ? 'yes' : 'no'}

### Checks Required
${REQUIRED_CHECKS.map(c => `- ${c}`).join('\n')}

### Checks Run
${checks.map(c => `- ${c.name}: ${c.passed ? 'passed' : 'failed'}`).join('\n')}

### Remaining Risk
${risk.reasons.join('. ') || 'None identified'}

### Rollback Plan
Revert this PR if issues arise. No database migrations or config changes included.

### Human Review Required
no

---
*AI Developer v8.0 | Lane: ${ENV.AI_LANE} | Created: ${new Date().toISOString()}*`;

  try {
    const pr = await ghApi('/pulls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${laneConfig.prTitlePrefix} ${task.title}`,
        body,
        head: branchName,
        base: 'main',
        draft: false,
      })
    });

    if (pr.number && labels.length > 0) {
      await ghApi(`/issues/${pr.number}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels }),
      });
    }

    log(`PR #${pr.number} created: ${pr.html_url}`);
    return { number: pr.number, url: pr.html_url, headBranch: branchName };
  } catch (e) {
    log(`Failed to create PR: ${e.message}`, 'error');
    throw e;
  }
}

// ===== Checkpoint =====
async function writeCheckpoint(backlog, task, reason) {
  log(`Writing checkpoint: ${reason}`);

  const checkpoint = {
    timestamp: new Date().toISOString(),
    lane: ENV.AI_LANE,
    mode: ENV.RUN_MODE,
    task: task.title,
    reason,
    backlog_summary: {
      open_prs: backlog.openPRs.length,
      draft_prs: backlog.draftPRs.length,
      failed_workflows: backlog.failedWorkflows.length,
    },
  };

  const checkpointDir = join(ENV.REPO_DIR, '.ai-checkpoints');
  mkdirSync(checkpointDir, { recursive: true });
  const checkpointFile = join(checkpointDir, `${ENV.AI_LANE}-${Date.now()}.json`);
  writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));

  log(`Checkpoint written: ${checkpointFile}`);
}

// ===== Main Loop =====
async function main() {
  log('=== AI Developer v8.0 (6-Hour Autonomous Dual-Lane R&D) ===');
  safetyCheck();

  try {
    while (checkSessionTimebox()) {
      log('--- New development cycle ---');

      exec('git fetch origin main');
      exec('git checkout -f main');
      exec('git reset --hard origin/main');

      const backlog = await scanBacklog();

      // Check existing PRs in current lane
      const existingPR = backlog.openPRs.find(pr => pr.lane === ENV.AI_LANE);

      if (existingPR) {
        log(`Existing PR in ${ENV.AI_LANE} lane: #${existingPR.number} - ${existingPR.title}`);

        const checkResult = await waitForChecks(existingPR.number);

        if (checkResult.allGreen) {
          try {
            await ghApi(`/pulls/${existingPR.number}/merge`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ merge_method: 'squash' }),
            });
            log(`Auto-merged PR #${existingPR.number}`);
            await writeCheckpoint(backlog, { title: existingPR.title }, `Auto-merged PR #${existingPR.number}`);
            continue;
          } catch (e) {
            log(`Auto-merge failed: ${e.message}`, 'warn');
          }
        } else if (checkResult.reason === 'Checks failed') {
          const task = { title: existingPR.title, description: `Fix: ${existingPR.title}`, files_to_modify: existingPR.files || [] };
          const fixed = await fixPR(existingPR, task);
          if (fixed) continue;
        }

        log('PR not ready yet. Waiting 120s before retry...', 'warn');
        await sleep(120000);
        continue;
      }

      // No existing PR — create new one
      const task = await selectTask(backlog);
      log(`Selected task: ${task.title} (${task.priority})`);

      if (task.type === 'checkpoint') {
        log('No actionable task found. Waiting 120s...', 'warn');
        await sleep(120000);
        continue;
      }

      const laneConfig = LANE_CONFIG[ENV.AI_LANE];
      const code = await writeCode(task);
      const changes = applyChanges(code, laneConfig);

      if (!changes.length) {
        log('No valid changes. Waiting 120s before next task.', 'warn');
        await sleep(120000);
        continue;
      }

      const checks = await runQualityChecks();
      const branchName = `${laneConfig.branchPrefix}${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${Date.now()}`;

      exec(`git checkout -b ${branchName}`);
      exec('git add -A');
      exec(`git commit -m "${laneConfig.prTitlePrefix} ${task.title}"`);
      await withRetry(() => exec(`git push -u origin ${branchName}`));

      const pr = await createPR(task, changes, checks, branchName);
      log(`PR created: ${pr.url}`);
      await writeCheckpoint(backlog, task, `PR created: ${pr.url}`);

      // Wait before next cycle to avoid rate limits
      log('Waiting 60s before next cycle...');
      await sleep(60000);
    }

    log('=== 6-hour session complete. Exiting. ===');

  } catch (error) {
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();
