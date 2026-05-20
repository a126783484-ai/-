#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET_BRANCH = 'product/ux-p1-demo-flow';
const TARGET_FILE = process.env.PRODUCT_AGENT_TARGET_FILE || 'src/app/services/page.tsx';
const ALLOWED_FILES = new Set(['src/app/services/page.tsx', 'src/app/page.tsx', 'src/components/ModuleViews.tsx']);

function sh(cmd, allowFail = false) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    if (allowFail) return '';
    throw error;
  }
}

function fail(message) {
  console.error(`[Product UX Agent] ${message}`);
  process.exit(1);
}

function safetyCheck() {
  if (!ALLOWED_FILES.has(TARGET_FILE)) fail(`Blocked target file: ${TARGET_FILE}`);
  if (sh("git ls-files | grep '^import '", true)) fail('Blocked: root import-statement file exists.');
  if (sh("git ls-files | grep '^.ai-checkpoints'", true)) fail('Blocked: .ai-checkpoints exists.');
  const currentBranch = sh('git branch --show-current', true);
  if (currentBranch !== TARGET_BRANCH) fail(`Blocked: current branch is ${currentBranch}, expected ${TARGET_BRANCH}`);
}

function main() {
  safetyCheck();
  const command = readFileSync('docs/AI_PRODUCT_AGENT_COMMAND.md', 'utf8');
  const current = readFileSync(TARGET_FILE, 'utf8');

  const marker = 'Beauty OS P1 Product UX Agent active';
  if (current.includes(marker)) {
    console.log('[Product UX Agent] Target already contains product UX marker. No change.');
    return;
  }

  const updated = current.replace(
    'Beauty OS · Services',
    `Beauty OS · Services · ${marker}`,
  );

  if (updated === current) fail('No safe insertion point found.');
  writeFileSync(TARGET_FILE, updated, 'utf8');
  console.log(`[Product UX Agent] Updated ${TARGET_FILE} using command length ${command.length}.`);
}

main();
