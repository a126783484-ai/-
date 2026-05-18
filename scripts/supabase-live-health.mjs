#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const checks = [];

function add(level, code, message, detail = '') {
  checks.push({ level, code, message, detail });
}

function firstDefined(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

function projectRefFromUrl(url) {
  if (!url) return null;

  try {
    const hostname = new URL(url).hostname;
    const [projectRef, ...rest] = hostname.split('.');
    return rest.join('.') === 'supabase.co' && projectRef ? projectRef : null;
  } catch {
    return null;
  }
}

function runPsql(sql) {
  const dbUrl = firstDefined(process.env.SUPABASE_DB_URL, process.env.DATABASE_URL);
  if (!dbUrl) return null;

  try {
    return execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-Atc', sql], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    add('error', 'SUPABASE_DB_QUERY_FAILED', 'Failed to query Supabase database with psql.', error.stderr?.toString() || error.message);
    return '';
  }
}

async function fetchRestRoot(url, anonKey) {
  if (!url || !anonKey) {
    add('warn', 'SUPABASE_PUBLIC_ENV_MISSING', 'Public Supabase URL or anon key is missing; live HTTP reachability was skipped.');
    return;
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });

    if (response.ok) {
      add('pass', 'SUPABASE_REST_REACHABLE', 'Supabase REST endpoint is reachable with the configured anon key.');
    } else {
      add('warn', 'SUPABASE_REST_UNEXPECTED_STATUS', `Supabase REST endpoint returned HTTP ${response.status}.`, response.statusText);
    }
  } catch (error) {
    add('error', 'SUPABASE_REST_UNREACHABLE', 'Supabase REST endpoint could not be reached.', error.message);
  }
}

function expectedMigrationVersions() {
  const migrationDir = join(root, 'supabase', 'migrations');
  if (!existsSync(migrationDir)) return [];
  return readdirSync(migrationDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => name.split('_')[0])
    .sort();
}

function checkDatabaseState() {
  const dbUrl = firstDefined(process.env.SUPABASE_DB_URL, process.env.DATABASE_URL);
  if (!dbUrl) {
    add('warn', 'SUPABASE_DB_URL_MISSING', 'SUPABASE_DB_URL/DATABASE_URL is not configured; DB migration, RPC, and RLS checks were skipped.');
    return;
  }

  const migrations = runPsql('select version from supabase_migrations.schema_migrations order by version;');
  if (migrations !== null && migrations !== '') {
    const applied = new Set(migrations.split('\n').map((item) => item.trim()).filter(Boolean));
    const missing = expectedMigrationVersions().filter((version) => !applied.has(version));
    if (missing.length > 0) {
      add('error', 'SUPABASE_MIGRATIONS_MISSING', `Supabase DB is missing migration version(s): ${missing.join(', ')}.`);
    } else {
      add('pass', 'SUPABASE_MIGRATIONS_APPLIED', 'All repo migration versions are present in Supabase migration history.');
    }
  }

  const requiredRpcs = ['record_inventory_movement', 'accept_workspace_member_invite'];
  const rpcRows = runPsql(`
    select n.nspname || '.' || p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (${requiredRpcs.map((name) => `'${name}'`).join(', ')})
    order by 1;
  `);
  if (rpcRows !== null) {
    const found = new Set(rpcRows.split('\n').map((row) => row.replace(/^public\./, '').trim()).filter(Boolean));
    const missing = requiredRpcs.filter((name) => !found.has(name));
    if (missing.length > 0) {
      add('error', 'SUPABASE_REQUIRED_RPC_MISSING', `Required public RPC function(s) missing: ${missing.join(', ')}.`);
    } else {
      add('pass', 'SUPABASE_REQUIRED_RPC_PRESENT', 'Required public RPC functions exist.');
    }
  }

  const rlsTables = ['workspaces', 'workspace_members', 'staff_invites', 'customers', 'appointments', 'services', 'orders', 'order_lines', 'inventory_items', 'inventory_movements'];
  const rlsRows = runPsql(`
    select relname
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and relkind = 'r'
      and relname in (${rlsTables.map((name) => `'${name}'`).join(', ')})
      and relrowsecurity = true
    order by relname;
  `);
  if (rlsRows !== null) {
    const enabled = new Set(rlsRows.split('\n').map((row) => row.trim()).filter(Boolean));
    const missing = rlsTables.filter((name) => !enabled.has(name));
    if (missing.length > 0) {
      add('error', 'SUPABASE_RLS_DISABLED', `Expected RLS table(s) without RLS enabled: ${missing.join(', ')}.`);
    } else {
      add('pass', 'SUPABASE_RLS_ENABLED', 'RLS is enabled on expected tenant-scoped tables.');
    }
  }

  const policyRows = runPsql(`
    select tablename || ':' || policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('workspaces', 'workspace_members', 'staff_invites')
    order by tablename, policyname;
  `);
  if (policyRows !== null) {
    const count = policyRows.split('\n').map((row) => row.trim()).filter(Boolean).length;
    if (count === 0) {
      add('error', 'SUPABASE_CORE_POLICIES_MISSING', 'No RLS policies found for core workspace/staff tables.');
    } else {
      add('pass', 'SUPABASE_CORE_POLICIES_PRESENT', `Found ${count} core workspace/staff RLS policies.`);
    }
  }
}

async function main() {
  const publicUrl = firstDefined(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL);
  const anonKey = firstDefined(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.SUPABASE_ANON_KEY);
  const expectedRef = firstDefined(process.env.EXPECTED_SUPABASE_PROJECT_REF, process.env.SUPABASE_PROJECT_REF);
  const enforceRef = process.env.ENFORCE_SUPABASE_PROJECT_REF === 'true';
  const actualRef = projectRefFromUrl(publicUrl);

  if (!actualRef) {
    add('error', 'SUPABASE_PROJECT_REF_UNREADABLE', 'Could not derive Supabase project ref from configured URL.');
  } else if (expectedRef && expectedRef !== actualRef) {
    add(enforceRef ? 'error' : 'warn', 'SUPABASE_PROJECT_REF_MISMATCH', `Expected Supabase project ${expectedRef}, got ${actualRef}.`);
  } else {
    add('pass', 'SUPABASE_PROJECT_REF_OK', `Supabase project ref is ${actualRef || 'unknown'}.`);
  }

  await fetchRestRoot(publicUrl, anonKey);
  checkDatabaseState();

  const counts = checks.reduce((acc, check) => {
    acc[check.level] = (acc[check.level] || 0) + 1;
    return acc;
  }, { pass: 0, warn: 0, error: 0 });

  const report = {
    generatedAt: new Date().toISOString(),
    mode: firstDefined(process.env.SUPABASE_DB_URL, process.env.DATABASE_URL) ? 'live-db' : 'public-reachability',
    counts,
    checks
  };

  console.log(JSON.stringify(report, null, 2));

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = [
      '# Supabase Live Health',
      '',
      `Mode: ${report.mode}`,
      `Pass: ${counts.pass} | Warnings: ${counts.warn} | Errors: ${counts.error}`,
      '',
      '| Level | Code | Message |',
      '| --- | --- | --- |',
      ...checks.map((check) => `| ${check.level} | ${check.code} | ${check.message.replace(/\|/g, '\\|')} |`)
    ];
    await import('node:fs').then(({ appendFileSync }) => appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`));
  }

  if (counts.error > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
