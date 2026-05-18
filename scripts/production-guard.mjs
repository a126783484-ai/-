import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const findings = [];

function add(level, code, message, files = [], suggestion = '') {
  findings.push({ level, code, message, files, suggestion });
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

const files = walk(root).filter((path) => /\.(ts|tsx|js|jsx|mjs|sql|yml|yaml|md|json)$/.test(path));

const migrationDir = join(root, 'supabase', 'migrations');
const migrations = existsSync(migrationDir) ? readdirSync(migrationDir).filter((name) => name.endsWith('.sql')) : [];
const migrationPrefixes = new Map();
for (const name of migrations) {
  const prefix = name.split('_')[0];
  if (!migrationPrefixes.has(prefix)) migrationPrefixes.set(prefix, []);
  migrationPrefixes.get(prefix).push(name);
}
for (const [prefix, names] of migrationPrefixes.entries()) {
  if (names.length > 1) {
    add('error', 'DUPLICATE_MIGRATION_PREFIX', `Duplicate migration prefix ${prefix}.`, names.map((name) => `supabase/migrations/${name}`), 'Rename migrations so prefixes are unique and dependency order is deterministic.');
  }
}

for (const file of files) {
  const path = rel(file);
  const body = read(file);
  if (/SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['\"][^$]/.test(body)) {
    add('error', 'SERVICE_ROLE_KEY_LITERAL', 'Potential service role key literal or hardcoded service-role env assignment detected.', [path], 'Use a secure secret store reference. Never commit service-role values.');
  }
  if (/sb_secret_[A-Za-z0-9_-]{16,}/.test(body)) {
    add('error', 'SUPABASE_SECRET_LITERAL', 'Supabase secret key pattern detected in repository content.', [path], 'Rotate the exposed key and move it to a secret store.');
  }
  if (/diagnostics\/runtime/.test(path) || /api\/diagnostics/.test(path)) {
    if (!/getUser\(|requireCurrentUser|unauthorized|401/.test(body)) {
      add('warn', 'UNGUARDED_DIAGNOSTICS_ROUTE', 'Diagnostics route may lack an explicit auth guard.', [path], 'Delete the route or require authenticated/admin access.');
    }
  }
  if (/console\.error\(/.test(body)) {
    const count = (body.match(/console\.error\(/g) || []).length;
    add('info', 'CONSOLE_ERROR_USAGE', `${count} console.error call(s) found.`, [path], 'Prefer structured logging with request/workspace correlation when production logging is added.');
  }
  if (/on conflict[\s\S]{0,180}do update[\s\S]{0,220}(role|active\s*=\s*true)/i.test(body)) {
    add('error', 'INVITE_CONFLICT_ROLE_OR_REACTIVATION', 'ON CONFLICT DO UPDATE may overwrite role or reactivate a member.', [path], 'Use DO NOTHING or restrict updates to harmless fields; never reactivate or change roles through invite conflict handling.');
  }
}

if (!existsSync(join(root, 'src', 'app', 'error.tsx'))) {
  add('warn', 'MISSING_APP_ERROR_BOUNDARY', 'Missing src/app/error.tsx.', ['src/app/error.tsx'], 'Add a route-level error boundary before broad production rollout.');
}
if (!existsSync(join(root, 'src', 'app', 'global-error.tsx'))) {
  add('info', 'MISSING_GLOBAL_ERROR_BOUNDARY', 'Missing src/app/global-error.tsx.', ['src/app/global-error.tsx'], 'Consider adding a global fallback for unrecoverable app errors.');
}

const summary = {
  generatedAt: new Date().toISOString(),
  counts: findings.reduce((acc, item) => {
    acc[item.level] = (acc[item.level] || 0) + 1;
    return acc;
  }, {}),
  findings
};

console.log('Beauty OS Production Guard');
console.log('==========================');
console.log(JSON.stringify(summary, null, 2));

const blocking = findings.filter((item) => item.level === 'error');
if (blocking.length > 0) {
  console.error(`Production guard found ${blocking.length} blocking issue(s).`);
  process.exit(1);
}

console.log('Production guard completed with no blocking issues.');
