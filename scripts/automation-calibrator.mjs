import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

const guard = readJson('production-guard-report.json');
const risk = readJson('pr-risk-report.json');
const workflowName = process.env.WORKFLOW_NAME || 'unknown';
const workflowConclusion = process.env.WORKFLOW_CONCLUSION || 'unknown';
const changedFiles = process.env.CHANGED_FILES
  ? process.env.CHANGED_FILES.split('\n').map((item) => item.trim()).filter(Boolean)
  : [];

const decisions = [];

function decide(level, code, message, action, safeAutoFix = false) {
  decisions.push({ level, code, message, action, safeAutoFix });
}

const guardErrors = guard?.counts?.error || 0;
const guardWarnings = guard?.counts?.warn || 0;
const guardFindings = guard?.findings || [];
const riskLabels = risk?.labels || [];

const changedOnlyAutomation = changedFiles.length > 0 && changedFiles.every((file) =>
  file.startsWith('.github/workflows/') ||
  file.startsWith('scripts/') ||
  file.startsWith('tests/smoke/') ||
  file === 'playwright.config.ts' ||
  file === 'tsconfig.json' ||
  file === 'package.json' ||
  file === 'package-lock.json' ||
  file.startsWith('tools/') ||
  file.startsWith('docs/')
);

if (workflowConclusion === 'failure' && changedOnlyAutomation) {
  decide(
    'calibrate',
    'AUTOMATION_LAYER_FAILURE',
    'Failure occurred while only automation/governance/tooling files changed.',
    'Treat as automation calibration work. Prefer fixing workflow/test/guard scripts before touching app code.',
    true
  );
}

if (guardErrors > 0 && guard?.mode === 'baseline-advisory') {
  decide(
    'advisory',
    'BASELINE_RISK_DETECTED',
    `Production Guard detected ${guardErrors} error-level baseline risk(s), but baseline advisory mode is enabled.`,
    'Do not block the governance PR. Convert findings into follow-up hardening tasks.',
    false
  );
}

for (const finding of guardFindings) {
  if (finding.code === 'DUPLICATE_MIGRATION_PREFIX') {
    decide(
      'follow-up',
      'MIGRATION_NUMBERING_CLEANUP',
      'Duplicate migration prefix requires a separate migration-ordering PR.',
      'Open or reuse a focused PR that only renames migrations and preserves SQL content.',
      false
    );
  }

  if (finding.code === 'UNGUARDED_DIAGNOSTICS_ROUTE') {
    decide(
      'follow-up',
      'DIAGNOSTICS_ROUTE_CLEANUP',
      'Diagnostics route may expose infrastructure metadata.',
      'Open a focused security cleanup PR to delete the route or add an auth/admin guard.',
      false
    );
  }

  if (finding.code === 'MISSING_APP_ERROR_BOUNDARY') {
    decide(
      'follow-up',
      'ERROR_BOUNDARY_OBSERVABILITY',
      'Missing route-level error boundary.',
      'Open an observability PR adding a minimal src/app/error.tsx fallback.',
      true
    );
  }
}

if (workflowName.includes('Smoke') && workflowConclusion === 'failure') {
  decide(
    'calibrate',
    'SMOKE_TEST_FAILURE',
    'Smoke test failed. First determine whether this is app breakage or test brittleness.',
    'Use Playwright artifact screenshot/trace. If login succeeds but text assertion fails, relax selector. If route returns 500, treat as app bug.',
    true
  );
}

if (workflowName === 'CI' && workflowConclusion === 'failure') {
  decide(
    'calibrate',
    'CI_FAILURE',
    'CI failed. Identify whether failure is app typecheck/test/build or automation tooling integration.',
    'If failure is caused by automation tooling types, isolate tooling from app typecheck or add proper dev dependency.',
    true
  );
}

if (riskLabels.some((label) => ['risk:security', 'risk:migration', 'risk:tenant-isolation', 'risk:auth', 'risk:staff-member'].includes(label))) {
  decide(
    'gate',
    'HIGH_RISK_SURFACE',
    'PR touches high-risk production surface.',
    'Never auto-deploy. Require final human/CTO review even if checks are green.',
    false
  );
}

if (decisions.length === 0) {
  decide(
    'clean',
    'NO_CALIBRATION_NEEDED',
    'No calibration action detected.',
    'Continue normal engineering workflow.',
    false
  );
}

const report = {
  generatedAt: new Date().toISOString(),
  workflowName,
  workflowConclusion,
  changedFiles,
  changedOnlyAutomation,
  guardCounts: guard?.counts || null,
  riskLabels,
  decisions
};

writeFileSync('automation-calibration-report.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
