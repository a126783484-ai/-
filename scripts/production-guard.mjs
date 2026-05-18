import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const root = process.cwd();
const findings = [];
const outputPath = process.env.PRODUCTION_GUARD_OUTPUT || 'production-guard-report.json';
const strictMode = process.env.PRODUCTION_GUARD_STRICT === 'true';

function add(level, code, message, files = [], suggestion = '', aiPrompt = '') {
  findings.push({ level, code, message, files, suggestion, aiPrompt });
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (['node_modules', '.git', '.next', 'coverage', 'dist', 'build'].includes(entry)) continue;
    const path = join(dir, entry);
    const info = statSync(path);
    if (info.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

function rel(path) {
  return relative(root, path);
}

function countByLevel(items) {
  return items.reduce((acc, item) => {
    acc[item.level] = (acc[item.level] || 0) + 1;
    return acc;
  }, { error: 0, warn: 0, info: 0 });
}

function tableRow(values) {
  return `| ${values.map((value) => String(value).replace(/\n/g, '<br>')).join(' | ')} |`;
}

const files = walk(root).filter((path) => /\.(ts|tsx|js|jsx|mjs|sql|yml|yaml|md|json)$/.test(path));

const migrationDir = join(root, 'supabase', 'migrations');
const migrations = existsSync(migrationDir) ? readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort() : [];
const migrationPrefixes = new Map();
for (const name of migrations) {
  const prefix = name.split('_')[0];
  if (!migrationPrefixes.has(prefix)) migrationPrefixes.set(prefix, []);
  migrationPrefixes.get(prefix).push(name);
}
for (const [prefix, names] of migrationPrefixes.entries()) {
  if (names.length > 1) {
    add('error', 'DUPLICATE_MIGRATION_PREFIX', `Duplicate migration prefix ${prefix}.`, names.map((name) => `supabase/migrations/${name}`), 'Rename migrations so prefixes are unique and dependency order is deterministic.', `Fix duplicate migration prefix ${prefix}. Keep dependency order deterministic and avoid changing SQL content unless required.`);
  }
}

for (const file of files) {
  const path = rel(file);
  const body = read(file);

  if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['\"][^$]/.test(body)) {
    add('error', 'SERVICE_ROLE_KEY_LITERAL', 'Potential hardcoded service-role env assignment detected.', [path], 'Use a secure secret store reference. Never commit service-role values.', 'Inspect this file for hardcoded service-role usage. Replace literal values with secret-store references only.');
  }

  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(body)) {
    add('error', 'SUPABASE_SECRET_LITERAL', 'Supabase secret key pattern detected in repository content.', [path], 'Rotate the exposed key and move it to a secret store.', 'Treat this as credential exposure. Remove the literal, rotate the key, and document the remediation.');
  }

  if (/diagnostics\/runtime/.test(path) || /api\/diagnostics/.test(path)) {
    if (!/getUser\(|requireCurrentUser|unauthorized|401/.test(body)) {
      add('warn', 'UNGUARDED_DIAGNOSTICS_ROUTE', 'Diagnostics route may lack an explicit auth guard.', [path], 'Delete the route or require authenticated/admin access.', 'Validate whether this diagnostics route is reachable in production. Prefer deletion or explicit auth/admin guard.');
    }
  }

  if (/console\.error\(/.test(body)) {
    const count = (body.match(/console\.error\(/g) || []).length;
    add('info', 'CONSOLE_ERROR_USAGE', `${count} console.error call(s) found.`, [path], 'Prefer structured logging with request/workspace correlation when production logging is added.', 'Do not refactor immediately. Track this for observability hardening.');
  }

  if (path.endsWith('.sql') && /on conflict[\s\S]{0,180}do update[\s\S]{0,220}(role|active\s*=\s*true)/i.test(body)) {
    add('error', 'INVITE_CONFLICT_ROLE_OR_REACTIVATION', 'ON CONFLICT DO UPDATE may overwrite role or reactivate a member.', [path], 'Use DO NOTHING or restrict updates to harmless fields; never reactivate or change roles through invite conflict handling.', 'Patch only the invite conflict path. Do not change unrelated SQL. Preserve new-member happy path and block existing-member role changes.');
  }
}

if (!existsSync(join(root, 'src', 'app', 'error.tsx'))) {
  add('warn', 'MISSING_APP_ERROR_BOUNDARY', 'Missing src/app/error.tsx.', ['src/app/error.tsx'], 'Add a route-level error boundary before broad production rollout.', 'Create a minimal Next.js error boundary in a separate observability PR.');
}

if (!existsSync(join(root, 'src', 'app', 'global-error.tsx'))) {
  add('info', 'MISSING_GLOBAL_ERROR_BOUNDARY', 'Missing src/app/global-error.tsx.', ['src/app/global-error.tsx'], 'Consider adding a global fallback for unrecoverable app errors.', 'Track as P1 observability work; do not block unrelated PRs.');
}

const counts = countByLevel(findings);
const summary = {
  generatedAt: new Date().toISOString(),
  mode: strictMode ? 'strict-blocking' : 'baseline-advisory',
  policy: {
    blocksOn: strictMode ? ['error'] : [],
    advisoryOnly: strictMode ? ['warn', 'info'] : ['error', 'warn', 'info'],
    goal: 'Save engineering and AI-token cost by catching repeatable production risks automatically without blocking baseline cleanup work.'
  },
  counts,
  findings
};

mkdirSync(dirname(join(root, outputPath)), { recursive: true });
writeFileSync(join(root, outputPath), `${JSON.stringify(summary, null, 2)}\n`);

console.log('Beauty OS Production Guard');
console.log('==========================');
console.log(`Mode: ${summary.mode}`);
console.log(`Errors: ${counts.error} | Warnings: ${counts.warn} | Info: ${counts.info}`);
console.log(`Machine-readable report: ${outputPath}`);

for (const finding of findings) {
  console.log(`\n[${finding.level.toUpperCase()}] ${finding.code}`);
  console.log(`- ${finding.message}`);
  if (finding.files.length) console.log(`- Files: ${finding.files.join(', ')}`);
  if (finding.suggestion) console.log(`- Suggestion: ${finding.suggestion}`);
  if (finding.aiPrompt) console.log(`- AI handoff: ${finding.aiPrompt}`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [];
  lines.push('# Beauty OS Production Guard');
  lines.push('');
  lines.push(`**Mode:** ${summary.mode}  `);
  lines.push(`**Errors:** ${counts.error}  `);
  lines.push(`**Warnings:** ${counts.warn}  `);
  lines.push(`**Info:** ${counts.info}`);
  lines.push('');
  lines.push('This guard reduces engineering cost and AI-token waste by catching repeatable production risks automatically.');
  lines.push('');
  lines.push(tableRow(['Level', 'Code', 'Files', 'Suggested next action']));
  lines.push(tableRow(['---', '---', '---', '---']));
  for (const finding of findings) {
    lines.push(tableRow([finding.level, finding.code, finding.files.join('<br>') || '-', finding.suggestion || '-']));
  }
  lines.push('');
  lines.push('## AI Handoff Prompts');
  lines.push('');
  for (const finding of findings.filter((item) => item.aiPrompt)) {
    lines.push(`### ${finding.code}`);
    lines.push('');
    lines.push('```text');
    lines.push(finding.aiPrompt);
    lines.push('```');
    lines.push('');
  }
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

if (strictMode && counts.error > 0) {
  console.error(`Production guard found ${counts.error} blocking issue(s).`);
  process.exit(1);
}

if (!strictMode && counts.error > 0) {
  console.log(`Production guard found ${counts.error} error-level issue(s), but baseline advisory mode is enabled.`);
}

console.log('Production guard completed.');
