#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function firstDefined(...values) {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();
}

const dbUrl = firstDefined(process.env.SUPABASE_DB_URL, process.env.DATABASE_URL);

if (!dbUrl) {
  console.error('SUPABASE_DB_URL or DATABASE_URL is required to apply the shift leave type migration.');
  process.exit(1);
}

const migrationPath = join(process.cwd(), 'supabase', 'migrations', '0009_shift_leave_type.sql');
const sql = readFileSync(migrationPath, 'utf8');

execFileSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1'], {
  input: sql,
  encoding: 'utf8',
  stdio: ['pipe', 'inherit', 'inherit'],
});

const columnCheck = execFileSync(
  'psql',
  [
    dbUrl,
    '-v',
    'ON_ERROR_STOP=1',
    '-Atc',
    "select count(*) from information_schema.columns where table_schema='public' and table_name='shifts' and column_name='leave_type';",
  ],
  { encoding: 'utf8' },
).trim();

if (columnCheck !== '1') {
  console.error('Migration completed but shifts.leave_type was not found.');
  process.exit(1);
}

console.log('Shift leave type migration applied and verified.');
