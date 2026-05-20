#!/usr/bin/env node
/**
 * Beauty OS AI Automation Governance
 *
 * Safety-first automation layer:
 * - validates repo paths before every write
 * - routes simple work to cheap models
 * - keeps PRs draft-only
 * - never auto-merges or self-repairs
 * - limits prompts to task-scoped context
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';

const ENV = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  REPO_DIR: process.env.BEAUTY_OS_REPO || process.cwd(),
  REPO: process.env.GITHUB_REPOSITORY || 'Johnnie1266789/beauty-os',
  AI_LANE: process.env.AI_LANE || 'product',
  AI_MODEL_ROUTER: process.env.AI_MODEL_ROUTER || 'cost-optimized',
  AI_MERGE_ALLOWED: process.env.AI_MERGE_ALLOWED === 'true',
  AI_SELF_REPAIR_ALLOWED: process.env.AI_SELF_REPAIR_ALLOWED === 'true',
  AI_DEVELOPMENT_ALLOWED: process.env.AI_DEVELOPMENT_ALLOWED === 'true',
  SUPERVISION_ENABLED: process.env.SUPERVISION_ENABLED === 'true',
  AI_ENGINE_LANE_ENABLED: process.env.AI_ENGINE_LANE_ENABLED === 'true',
  AI_PRODUCT_LANE_ENABLED: process.env.AI_PRODUCT_LANE_ENABLED === 'true',
  AI_GOVERNANCE_ANALYZE_ONLY: process.env.AI_GOVERNANCE_ANALYZE_ONLY !== 'false',
  DRY_RUN: process.env.DRY_RUN === 'true',
  AI_WRITE_ALLOWED: process.env.AI_WRITE_ALLOWED === 'true',
  AI_RUN_MODE: process.env.AI_RUN_MODE || 'draft_pr',
  AI_AUTO_ENABLED: false,
  AI_MAX_FALLBACKS: Number.parseInt(process.env.AI_MAX_FALLBACKS || '3', 10),
};

const MODEL_POOLS = {
  cheap: ['llama-3.1-8b-instant', 'groq/compound-mini'],
  medium: ['qwen/qwen3-32b', 'openai/gpt-oss-20b'],
  hard: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b'],
  safety: ['meta-llama/llama-prompt-guard-2-22m', 'meta-llama/llama-prompt-guard-2-86m', 'openai/gpt-oss-safeguard-20b'],
};

const TOKEN_BUDGETS = {
  cheap: 900,
  medium: 1600,
  hard: 2800,
  safety: 384,
};

const REQUIRED_CHECKS = ['build', 'lint', 'typecheck', 'test'];
const LOW_RISK_PRODUCT_FILE_LIMIT = 3;

const LANE_CONFIG = {
  engine: {
    branchPrefix: 'ai-engine/',
    prTitlePrefix: '[AI Engine]',
    labels: ['ai-engine', 'automation', 'human-review-required'],
    allowedPaths: [
      /^scripts\/ai-developer\.mjs$/,
      /^docs\/AI_AUTOMATION_GOVERNANCE\.md$/,
      /^docs\/AI_MODEL_ROUTING\.md$/,
    ],
    blockedPaths: [/^src\//, /^\.github\/workflows\//],
  },
  product: {
    branchPrefix: 'ai-product/',
    prTitlePrefix: '[AI Product]',
    labels: ['ai-product', 'product', 'human-review-required'],
    allowedPaths: [/^src\/app\//, /^src\/components\//, /^src\/lib\//, /^src\/styles\//],
    blockedPaths: [
      /auth/i,
      /login/i,
      /session/i,
      /payment/i,
      /billing/i,
      /tenant/i,
      /workspace/i,
      /member/i,
      /invite/i,
      /secrets/i,
      /\.env/i,
      /migrations?/i,
      /migration/i,
      /database/i,
      /workflows?/i,
      /package\.json/i,
      /package-lock\.json/i,
      /scripts\/ai-/i,
      /supabase/i,
      /RLS/i,
    ],
  },
};

const HIGH_RISK_LABELS = new Set([
  'risk:p0',
  'risk:p1',
  'risk:infra',
  'risk:high',
  'risk:security',
  'guard:blocking',
  'commander:manual-review-required',
  'human-review-required',
]);

const BLOCKED_CONTENT_PATTERNS = [
  /\bplaceholder\b/i,
  /\bmock data\b/i,
  /\bfake data\b/i,
  /\bsample data\b/i,
  /\blorem ipsum\b/i,
  /\bTODO\b/i,
  /\bFIXME\b/i,
];

const MODEL_POINTERS = { cheap: 0, medium: 0, hard: 0, safety: 0 };

function log(message, level = 'info') {
  const prefix = level === 'error' ? 'ERROR' : level === 'warn' ? 'WARN' : 'OK';
  console.log(`[AI Gov ${prefix}] [${ENV.AI_LANE}] ${new Date().toISOString()} - ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: ENV.REPO_DIR,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (error) {
    if (options.ignoreError) return '';
    log(`Command failed: ${cmd}`, 'error');
    throw error;
  }
}

async function withRetry(fn, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      log(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`, 'warn');
      if (attempt === maxRetries) throw error;
      await sleep(delay * attempt);
    }
  }
}

function safetyCheck() {
  const missing = [];

  if (!ENV.GROQ_API_KEY) missing.push('GROQ_API_KEY (secret)');
  if (!ENV.GITHUB_TOKEN) missing.push('GITHUB_TOKEN (secret)');
  if (!ENV.SUPERVISION_ENABLED) missing.push('SUPERVISION_ENABLED=true');
  if (!ENV.AI_DEVELOPMENT_ALLOWED) missing.push('AI_DEVELOPMENT_ALLOWED=true');
  if (ENV.AI_AUTO_ENABLED) missing.push('AI_AUTO_ENABLED must stay false for governance mode');
  if (ENV.AI_RUN_MODE !== 'draft_pr') missing.push('AI_RUN_MODE=draft_pr');

  if (ENV.AI_LANE === 'engine' && !ENV.AI_ENGINE_LANE_ENABLED) {
    missing.push('AI_ENGINE_LANE_ENABLED=true for engine lane');
  }
  if (ENV.AI_LANE === 'product' && !ENV.AI_PRODUCT_LANE_ENABLED) {
    missing.push('AI_PRODUCT_LANE_ENABLED=true for product lane');
  }

  if (missing.length > 0) {
    log(`Missing or unsafe variables: ${missing.join(', ')}`, 'warn');
    log('Exiting safely. No files written, no PRs created.', 'warn');
    process.exit(0);
  }
}

function normalizeRepoPath(filePath) {
  return String(filePath || '').trim().replace(/\\/g, '/');
}

function isCodeLikePath(candidate) {
  return /(^import\s|\bfrom\b|\bexport\b|\bfunction\b|\bconst\b|\blet\b|\bvar\b|=>|<[^>]+>)/i.test(candidate);
}

function validateRepoPath(filePath, laneConfig = LANE_CONFIG[ENV.AI_LANE]) {
  const candidate = normalizeRepoPath(filePath);
  const blockedReasons = [];

  if (!candidate) blockedReasons.push('empty path');
  if (isAbsolute(candidate)) blockedReasons.push('absolute path');
  if (candidate.includes('..')) blockedReasons.push('path traversal');
  if (/\r|\n/.test(candidate)) blockedReasons.push('newline in path');
  if (/[;'"`{}()]/.test(candidate)) blockedReasons.push('illegal filename characters');
  if (candidate.startsWith('import ') || candidate.startsWith('export ')) blockedReasons.push('import/export statement used as filename');
  if (isCodeLikePath(candidate)) blockedReasons.push('filename looks like code');

  const allowed = laneConfig.allowedPaths.some((pattern) => pattern.test(candidate));
  if (!allowed) blockedReasons.push('outside allowlist');

  for (const pattern of laneConfig.blockedPaths) {
    if (pattern.test(candidate)) blockedReasons.push(`blocked surface: ${pattern}`);
  }

  return {
    ok: blockedReasons.length === 0,
    path: candidate,
    blockedReasons,
  };
}

function classifyRisk(files, labels = [], lane = ENV.AI_LANE, checks = []) {
  const normalizedFiles = files.map(normalizeRepoPath).filter(Boolean);
  const reasons = [];

  if (lane === 'engine') {
    return {
      risk: 'high',
      confidence: 'high',
      humanReviewRequired: true,
      autoMergeAllowed: false,
      reasons: ['Engine lane is always high risk'],
    };
  }

  if (labels.some((label) => HIGH_RISK_LABELS.has(label))) {
    return {
      risk: 'high',
      confidence: 'high',
      humanReviewRequired: true,
      autoMergeAllowed: false,
      reasons: ['High-risk label present'],
    };
  }

  const laneConfig = LANE_CONFIG.product;
  const touchesBlockedSurface = normalizedFiles.some((file) => laneConfig.blockedPaths.some((pattern) => pattern.test(file)));
  if (touchesBlockedSurface) {
    return {
      risk: 'high',
      confidence: 'high',
      humanReviewRequired: true,
      autoMergeAllowed: false,
      reasons: ['Touches blocked or sensitive surface'],
    };
  }

  const withinProductSurface = normalizedFiles.every((file) => laneConfig.allowedPaths.some((pattern) => pattern.test(file)));
  const lowRiskFileCount = normalizedFiles.length > 0 && normalizedFiles.length <= LOW_RISK_PRODUCT_FILE_LIMIT;
  const checksPassed = checks.every((check) => check.status === 'passed' || check.status === 'skipped');
  const contentClean = !checks.some((check) => check.blockedContent);

  if (withinProductSurface && lowRiskFileCount && checksPassed && contentClean) {
    return {
      risk: 'low',
      confidence: 'high',
      humanReviewRequired: true,
      autoMergeAllowed: false,
      reasons: ['Product-only scope with passing checks'],
    };
  }

  if (!withinProductSurface) {
    reasons.push('Outside product allowlist');
  }
  if (!lowRiskFileCount) {
    reasons.push(`Touches ${normalizedFiles.length} files; low-risk product cap is ${LOW_RISK_PRODUCT_FILE_LIMIT}`);
  }
  if (!checksPassed) {
    reasons.push('Build/lint/typecheck/test did not all pass');
  }
  if (!contentClean) {
    reasons.push('Contains placeholder or mock content');
  }

  return {
    risk: 'medium',
    confidence: reasons.length > 1 ? 'medium' : 'high',
    humanReviewRequired: true,
    autoMergeAllowed: false,
    reasons,
  };
}

function selectModelTier({ lane = ENV.AI_LANE, risk = 'low', safety = false, taskText = '', fileCount = 0 }) {
  if (safety) return 'safety';
  if (lane === 'engine') return 'hard';

  const text = `${taskText} ${lane}`.toLowerCase();
  const looksGovernance = /governance|policy|review|draft pr|draft-pr|routing|checklist|validation/.test(text);
  const looksHard = /migrate|migration|workflow|automation|repair|classifier|cross[- ]file|architecture|refactor|duplicate|merge/.test(text) || fileCount > 3;
  const looksMedium = /auth|payment|billing|tenant|workspace|table|schema|component|layout|form|validation|state|api|endpoint|lib|styles?/.test(text);

  if (looksGovernance && lane !== 'engine') return 'cheap';
  if (risk === 'high' || looksHard) return 'hard';
  if (risk === 'medium' || looksMedium) return 'medium';
  return 'cheap';
}

function nextModel(tier) {
  const pool = MODEL_POOLS[tier];
  const index = MODEL_POINTERS[tier] % pool.length;
  MODEL_POINTERS[tier] += 1;
  return pool[index];
}

async function callGroq(systemPrompt, userPrompt, { maxTokens = 900, tier = 'cheap', fallbackCount = 0, maxFallbacks = ENV.AI_MAX_FALLBACKS } = {}) {
  const model = nextModel(tier);
  const tokenBudget = TOKEN_BUDGETS[tier] || TOKEN_BUDGETS.cheap;
  const cappedTokens = Math.min(maxTokens, tokenBudget);

  log(`Calling Groq with ${model} (${tier}, ${cappedTokens} tokens)`);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: cappedTokens,
    }),
  });

  const data = await response.json();
  if (data.error) {
    const message = data.error.message || '';
    const shouldFallback = (message.includes('Rate limit') || message.includes('not found') || message.includes('does not exist')) && fallbackCount < maxFallbacks;
    if (shouldFallback) {
      const nextTier = tier === 'cheap' ? 'medium' : tier === 'medium' ? 'hard' : tier;
      log(`Groq fallback ${fallbackCount + 1}/${maxFallbacks} for ${model}: ${message}`, 'warn');
      return callGroq(systemPrompt, userPrompt, {
        maxTokens,
        tier: nextTier,
        fallbackCount: fallbackCount + 1,
        maxFallbacks,
      });
    }
    if (fallbackCount >= maxFallbacks) {
      throw new Error(`Groq API (${model}) fallback limit reached after ${maxFallbacks} attempts: ${message}`);
    }
    throw new Error(`Groq API (${model}): ${message}`);
  }

  return data.choices[0].message.content;
}

async function ghApi(path, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${ENV.REPO}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${ENV.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
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
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${ENV.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${JSON.stringify(payload.errors)}`);
  }
  return payload.data;
}

async function scanBacklog() {
  const backlog = {
    openPRs: [],
    draftPRs: [],
    failedWorkflows: [],
  };

  const [owner, name] = ENV.REPO.split('/');
  const data = await ghGraphQL(
    `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          pullRequests(first: 50, states: OPEN, orderBy: { field: UPDATED_AT, direction: DESC }) {
            nodes {
              number
              title
              url
              isDraft
              headRefName
              headRefOid
              labels(first: 20) { nodes { name } }
              files(first: 100) { nodes { path } }
            }
          }
        }
      }
    `,
    { owner, name },
  );

  for (const pr of data.repository.pullRequests.nodes || []) {
    const info = {
      number: pr.number,
      title: pr.title,
      url: pr.url,
      isDraft: pr.isDraft,
      headBranch: pr.headRefName,
      headSha: pr.headRefOid,
      labels: (pr.labels?.nodes || []).map((item) => item.name),
      files: (pr.files?.nodes || []).map((item) => item.path),
      lane: pr.headRefName?.startsWith('ai-engine/') ? 'engine' : pr.headRefName?.startsWith('ai-product/') ? 'product' : 'unknown',
    };

    if (pr.isDraft) backlog.draftPRs.push(info);
    else backlog.openPRs.push(info);
  }

  try {
    const runs = await ghApi('/actions/runs?status=completed&per_page=20');
    backlog.failedWorkflows = (runs.workflow_runs || [])
      .filter((run) => run.conclusion === 'failure')
      .slice(0, 10)
      .map((run) => ({
        name: run.name,
        html_url: run.html_url,
        head_branch: run.head_branch,
        head_sha: run.head_sha,
      }));
  } catch (error) {
    log(`Workflow scan skipped: ${error.message}`, 'warn');
  }

  return backlog;
}

function selectTask(backlog) {
  if (ENV.AI_LANE === 'engine' && backlog.failedWorkflows.length > 0) {
    const workflow = backlog.failedWorkflows[0];
    return {
      type: 'governance',
      title: `Document failed workflow: ${workflow.name}`,
      description: `Record the failure context for ${workflow.name} without enabling automation or merge.`,
      files_to_modify: ['docs/AI_AUTOMATION_GOVERNANCE.md'],
    };
  }

  return {
    type: 'governance',
    title: 'Harden AI automation governance',
    description: 'Add guardrails for path validation, cost-optimized routing, draft-only PRs, and human review requirements.',
    files_to_modify: ['scripts/ai-developer.mjs', 'docs/AI_AUTOMATION_GOVERNANCE.md', 'docs/AI_MODEL_ROUTING.md'],
  };
}

function buildPrompt(task, relevantFiles = [], selectedDiff = '') {
  return {
    system: `You are improving Beauty OS AI automation governance. Keep the output narrow, safe, and reviewable.\n\nRules:\n- never touch auth, payment, env, package.json, or database logic\n- keep prompts task-scoped\n- do not invent files\n- produce only the requested file blocks`,
    user: [
      `Task: ${task.title}`,
      `Description: ${task.description}`,
      relevantFiles.length ? `Relevant files: ${relevantFiles.join(', ')}` : 'Relevant files: none provided',
      selectedDiff ? `Selected diff:\n${selectedDiff}` : 'Selected diff: none provided',
      'Return code blocks in the form: ```\n// path/to/file\ncontent\n```',
    ].join('\n\n'),
  };
}

async function writeCode(task, context = {}) {
  const relevantFiles = context.relevantFiles || task.files_to_modify || [];
  const selectedDiff = context.selectedDiff || '';
  const prompt = buildPrompt(task, relevantFiles, selectedDiff);
  const tier = selectModelTier({
    lane: ENV.AI_LANE,
    risk: context.risk || 'low',
    taskText: `${task.title} ${task.description}`,
    fileCount: relevantFiles.length,
  });

  return callGroq(prompt.system, prompt.user, { tier, maxTokens: TOKEN_BUDGETS[tier] });
}

function applyChanges(code, laneConfig) {
  const regex = /```(?:typescript|tsx|javascript|json|md)?\n(?:\/\/\s*)?([^\n]+)\n([\s\S]*?)```/g;
  const changes = [];
  const blocked = [];
  const seen = new Set();
  const canWrite = ENV.AI_WRITE_ALLOWED && !ENV.DRY_RUN && !ENV.AI_GOVERNANCE_ANALYZE_ONLY;

  let match;
  while ((match = regex.exec(code)) !== null) {
    const filePath = match[1].trim().replace(/^\/\/\s*/, '');
    const content = match[2].trim();
    const validation = validateRepoPath(filePath, laneConfig);

    if (!validation.ok) {
      blocked.push({ filePath: validation.path, reasons: validation.blockedReasons });
      log(`Blocked path: ${validation.path} (${validation.blockedReasons.join('; ')})`, 'warn');
      continue;
    }

    if (seen.has(validation.path)) {
      blocked.push({ filePath: validation.path, reasons: ['duplicate file block'] });
      continue;
    }

    seen.add(validation.path);
    changes.push({ filePath: validation.path, content });
  }

  const limited = ENV.AI_LANE === 'product' ? changes.slice(0, LOW_RISK_PRODUCT_FILE_LIMIT) : changes.slice(0, Math.max(1, LOW_RISK_PRODUCT_FILE_LIMIT));
  const selected = [];

  for (const change of limited) {
    const normalizedContent = change.content.trim();
    if (BLOCKED_CONTENT_PATTERNS.some((pattern) => pattern.test(normalizedContent))) {
      blocked.push({ filePath: change.filePath, reasons: ['blocked placeholder/mock content'] });
      log(`Blocked content for ${change.filePath}`, 'warn');
      continue;
    }

    if (!canWrite) {
      log(`Analyze-only: skipped write for ${change.filePath}`);
      selected.push(change);
      continue;
    }

    const fullPath = join(ENV.REPO_DIR, change.filePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, normalizedContent, 'utf8');
    log(`Written: ${change.filePath}`);
    selected.push(change);
  }

  return { changes: selected, blocked };
}

async function runQualityChecks() {
  const checks = [];
  const packageJson = JSON.parse(readFileSync(join(ENV.REPO_DIR, 'package.json'), 'utf8'));
  const scripts = packageJson.scripts || {};

  for (const command of [
    { name: 'build', cmd: 'npm run build' },
    { name: 'lint', cmd: 'npm run lint' },
    { name: 'typecheck', cmd: 'npm run typecheck' },
    { name: 'test', cmd: 'npm run test' },
  ]) {
    if (!scripts[command.name]) {
      log(`${command.name} script skipped`, 'warn');
      checks.push({ name: command.name, status: 'skipped' });
      continue;
    }

    try {
      exec(command.cmd);
      checks.push({ name: command.name, status: 'passed' });
    } catch (error) {
      checks.push({ name: command.name, status: 'failed', error: error.message });
    }
  }

  return checks;
}

function buildPrBody(task, lane, risk, checks, changes) {
  return `## AI ${lane === 'engine' ? 'Engine' : 'Product'} Governance PR

**Lane**: ${lane}
**Single Objective**: ${task.title}
**Description**: ${task.description}

### Files Changed
${changes.map((change) => `- \`${change.filePath}\``).join('\n') || '- none'}

### Risk Classification
- **Risk Level**: ${risk.risk}
- **Confidence**: ${risk.confidence}
- **Reasons**: ${risk.reasons.join(', ') || 'None'}
- **Human Review Required**: yes
- **Auto-Merge Allowed**: no
- **Draft PR**: yes

### Checks Run
${checks.map((check) => `- ${check.name}: ${check.status}`).join('\n')}

### Governance Rules
- AI_MERGE_ALLOWED = ${ENV.AI_MERGE_ALLOWED ? 'true' : 'false'}
- AI_SELF_REPAIR_ALLOWED = ${ENV.AI_SELF_REPAIR_ALLOWED ? 'true' : 'false'}
- Engine lane is always high risk
- High-risk work never auto-merges
- Product low-risk work still requires human confirmation

---
*AI Automation Governance | ${new Date().toISOString()}*`;
}

async function createPR(task, changes, checks, branchName) {
  const risk = classifyRisk(changes.map((change) => change.filePath), LANE_CONFIG[ENV.AI_LANE].labels, ENV.AI_LANE, checks);
  const body = buildPrBody(task, ENV.AI_LANE, risk, checks, changes);
  const draft = true;

  const pr = await ghApi('/pulls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `${LANE_CONFIG[ENV.AI_LANE].prTitlePrefix} ${task.title}`,
      body,
      head: branchName,
      base: 'main',
      draft,
    }),
  });

  if (pr.number) {
    await ghApi(`/issues/${pr.number}/labels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        labels: [
          ...LANE_CONFIG[ENV.AI_LANE].labels,
          `risk:${risk.risk}`,
        ],
      }),
    });
  }

  log(`Draft PR created: ${pr.html_url}`);
  return { number: pr.number, url: pr.html_url, headBranch: branchName, risk };
}

function writeCheckpoint(backlog, task, reason) {
  const checkpoint = {
    timestamp: new Date().toISOString(),
    lane: ENV.AI_LANE,
    mode: ENV.AI_RUN_MODE,
    task: task.title,
    reason,
    backlogSummary: {
      openPRs: backlog.openPRs.length,
      draftPRs: backlog.draftPRs.length,
      failedWorkflows: backlog.failedWorkflows.length,
    },
  };

  console.log(`[AI Gov CHECKPOINT] ${JSON.stringify(checkpoint)}`);
}

async function main() {
  log('=== AI Automation Governance ===');
  safetyCheck();

  const backlog = await scanBacklog();
  const existingLanePR = backlog.openPRs.find((pr) => pr.lane === ENV.AI_LANE) || backlog.draftPRs.find((pr) => pr.lane === ENV.AI_LANE);
  const canWrite = ENV.AI_WRITE_ALLOWED && !ENV.DRY_RUN && !ENV.AI_GOVERNANCE_ANALYZE_ONLY;

  if (!canWrite) {
    log('Analyze-only mode enabled; skipping write, commit, and push steps.', 'warn');
  }

  if (existingLanePR) {
    log(`Existing ${ENV.AI_LANE} PR detected: #${existingLanePR.number}`, 'warn');
    writeCheckpoint(backlog, { title: existingLanePR.title }, `Existing PR blocked new creation: #${existingLanePR.number}`);
    return;
  }

  const task = selectTask(backlog);
  const laneConfig = LANE_CONFIG[ENV.AI_LANE];
  const code = await writeCode(task, {
    relevantFiles: task.files_to_modify,
    risk: ENV.AI_LANE === 'engine' ? 'high' : 'low',
  });
  const { changes } = applyChanges(code, laneConfig);

  if (!changes.length) {
    writeCheckpoint(backlog, task, 'No valid changes after governance filtering');
    return;
  }

  const checks = await runQualityChecks();
  const branchName = `${laneConfig.branchPrefix}${task.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${Date.now()}`;

  if (!canWrite) {
    writeCheckpoint(backlog, task, `Analyze-only report ready for ${changes.length} file(s)`);
    return;
  }

  exec(`git checkout -b ${branchName}`);
  exec('git add scripts/ai-developer.mjs docs/AI_AUTOMATION_GOVERNANCE.md docs/AI_MODEL_ROUTING.md');
  exec(`git commit -m "${laneConfig.prTitlePrefix} ${task.title}"`);
  await withRetry(() => exec(`git push -u origin ${branchName}`));

  const pr = await createPR(task, changes, checks, branchName);
  writeCheckpoint(backlog, task, `Draft PR created: ${pr.url}`);
}

main().catch((error) => {
  log(error.message, 'error');
  process.exit(1);
});
