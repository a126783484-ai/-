import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const sourceDirs = ['src/app', 'src/components', 'src/lib'];
const blockedPatterns = [
  {
    pattern: /登入\s*Demo\s*Workspace/i,
    message: 'Login must not use a fake Demo Workspace CTA.'
  },
  {
    pattern: /Demo\s*模式可直接進入/i,
    message: 'Auth copy must not claim demo access as a production path.'
  },
  {
    pattern: /href=["']\/["'][^>]*>\s*登入/i,
    message: 'Login UI must not link directly to the dashboard.'
  },
  {
    pattern: /TODO:\s*production/i,
    message: 'Production TODO markers must be resolved before merge.'
  }
];

function walk(dir) {
  const full = join(root, dir);
  return readdirSync(full).flatMap((name) => {
    const path = join(full, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(join(dir, name));
    if (!/\.(ts|tsx|js|jsx)$/.test(path)) return [];
    return [path];
  });
}

const failures = [];

for (const dir of sourceDirs) {
  for (const file of walk(dir)) {
    const content = readFileSync(file, 'utf8');
    for (const check of blockedPatterns) {
      if (check.pattern.test(content)) {
        failures.push(`${file}: ${check.message}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Quality gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Quality gate passed.');
