import { readFileSync, writeFileSync } from 'node:fs';

const changedFiles = process.env.CHANGED_FILES
  ? process.env.CHANGED_FILES.split('\n').map((item) => item.trim()).filter(Boolean)
  : [];

const categories = new Map([
  ['risk:security', []],
  ['risk:migration', []],
  ['risk:infra', []],
  ['risk:observability', []],
  ['risk:tenant-isolation', []],
  ['risk:auth', []],
  ['risk:staff-member', []],
  ['risk:ui', []],
]);

function add(label, file, reason) {
  categories.get(label)?.push({ file, reason });
}

for (const file of changedFiles) {
  if (file.includes('supabase/migrations/') || file.endsWith('.sql')) {
    add('risk:migration', file, 'Supabase migration or SQL changed. Requires ordering, rollback, and tenant-safety review.');
  }
  if (file.includes('.github/workflows/') || file.includes('vercel') || file.includes('scripts/')) {
    add('risk:infra', file, 'CI/CD, deployment, automation, or operational script changed.');
  }
  if (file.includes('supabase') || file.includes('env') || file.includes('diagnostics') || file.includes('service') || file.includes('secret')) {
    add('risk:security', file, 'Potential security-sensitive surface changed.');
  }
  if (file.includes('workspace') || file.includes('tenant') || file.includes('workspace_members')) {
    add('risk:tenant-isolation', file, 'Workspace or tenant isolation related file changed.');
  }
  if (file.includes('auth') || file.includes('login') || file.includes('callback') || file.includes('session')) {
    add('risk:auth', file, 'Authentication or session flow related file changed.');
  }
  if (file.includes('staff') || file.includes('invite') || file.includes('member')) {
    add('risk:staff-member', file, 'Staff/member or invite flow related file changed.');
  }
  if (file.includes('error.tsx') || file.includes('global-error') || file.includes('logging') || file.includes('sentry') || file.includes('health')) {
    add('risk:observability', file, 'Observability, error handling, or health surface changed.');
  }
  if (file.startsWith('src/app/') && (file.endsWith('.tsx') || file.endsWith('.css'))) {
    add('risk:ui', file, 'UI/app route changed.');
  }
}

const labels = [...categories.entries()].filter(([, items]) => items.length > 0).map(([label]) => label);

let guardReport = null;
try {
  guardReport = JSON.parse(readFileSync('production-guard-report.json', 'utf8'));
} catch {
  guardReport = null;
}

if (guardReport?.counts?.error > 0) labels.push('guard:blocking');
else if (guardReport?.counts?.warn > 0) labels.push('guard:warning');
else labels.push('guard:clean');

const report = {
  generatedAt: new Date().toISOString(),
  changedFiles,
  labels: [...new Set(labels)],
  categories: Object.fromEntries([...categories.entries()].filter(([, items]) => items.length > 0)),
  guardCounts: guardReport?.counts || null,
};

writeFileSync('pr-risk-report.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
