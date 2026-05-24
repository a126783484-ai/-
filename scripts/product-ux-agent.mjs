#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET_BRANCH = 'product/ux-p1-demo-flow';
const ALLOWED_FILES = [
  'src/app/services/page.tsx',
  'src/app/page.tsx',
  'src/components/ModuleViews.tsx',
];

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
  if (sh("git ls-files | grep '^import '", true)) fail('Blocked: root import-statement file exists.');
  if (sh("git ls-files | grep '^.ai-checkpoints'", true)) fail('Blocked: .ai-checkpoints exists.');
  const currentBranch = sh('git branch --show-current', true);
  if (currentBranch !== TARGET_BRANCH) fail(`Blocked: current branch is ${currentBranch}, expected ${TARGET_BRANCH}`);
}

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

function writeIfChanged(filePath, next) {
  const current = read(filePath);
  if (next === current) return null;
  writeFileSync(filePath, next, 'utf8');
  return filePath;
}

function includesAll(text, markers) {
  return markers.every((marker) => text.includes(marker));
}

function taskOrder(targetFile) {
  if (targetFile && !ALLOWED_FILES.includes(targetFile)) {
    fail(`Blocked: ${targetFile} is not an allowed P1 UX target.`);
  }
  if (!targetFile) return ALLOWED_FILES;
  return [targetFile, ...ALLOWED_FILES.filter((filePath) => filePath !== targetFile)];
}

function replaceAll(text, replacements) {
  return replacements.reduce(
    (next, [before, after]) => next.includes(before) ? next.replace(before, after) : next,
    text,
  );
}

function improveServicesPage() {
  const filePath = 'src/app/services/page.tsx';
  const current = read(filePath);
  const markers = ['服務摘要', '說明完整度', '待補說明', '美甲沙龍', '美業'];
  if (includesAll(current, markers)) {
    console.log('[Product UX Agent] Services page already has current P1 polish.');
    return null;
  }

  console.log('[Product UX Agent] Services page requires a scoped component edit; skipping broad replacements.');
  return null;
}

function improveHomePage() {
  const filePath = 'src/app/page.tsx';
  const current = read(filePath);
  const expected = `export const dynamic = "force-dynamic";

import { DashboardDeferredView } from "@/components/DeferredViews";
import { loadAppData } from "@/lib/app-data";

export default async function DashboardPage() {
  const data = await loadAppData();
  return <DashboardDeferredView data={data} />;
}
`;

  if (current.trim() === expected.trim()) {
    console.log('[Product UX Agent] Home page is already the dashboard entry.');
    return null;
  }
  return writeIfChanged(filePath, expected);
}

function improveModuleViews() {
  const filePath = 'src/components/ModuleViews.tsx';
  const current = read(filePath);
  const markers = ['美業老闆', '今日重點', '下一步行動', '預約轉換'];
  if (includesAll(current, markers)) {
    console.log('[Product UX Agent] ModuleViews already has current P1 demo flow polish.');
    return null;
  }

  const next = replaceAll(current, [
    [
      'subtitle="今日預約、營收、技師業績、熱門服務與風險提醒集中管理。"',
      'subtitle="給美業老闆看的今日重點：預約轉換、現金流、技師產能與需要處理的風險。"',
    ],
    [
      '<h2 className="text-lg font-bold text-plum">即將到店客人</h2>',
      '<h2 className="text-lg font-bold text-plum">今日重點：即將到店客人</h2>',
    ],
    [
      'action="新增第一筆預約後，這裡會顯示今日與近期排程。"',
      'action="下一步行動：新增第一筆預約後，這裡會顯示今日與近期排程。"',
    ],
    [
      'subtitle="新增、修改、取消預約；日曆 / 列表檢視與技師衝突檢查。"',
      'subtitle="把電話、LINE 與現場預約整理成清楚流程，協助櫃台確認時段、技師與服務內容。"',
    ],
    [
      'subtitle="電話、生日、LINE、偏好、過敏禁忌、會員等級與回訪提醒。"',
      'subtitle="沉澱客戶偏好、禁忌與回訪提醒，讓美甲沙龍更容易做熟客經營。"',
    ],
  ]);

  return writeIfChanged(filePath, next);
}

function runTask(filePath) {
  if (filePath === 'src/app/services/page.tsx') return improveServicesPage();
  if (filePath === 'src/app/page.tsx') return improveHomePage();
  if (filePath === 'src/components/ModuleViews.tsx') return improveModuleViews();
  fail(`Blocked: unsupported target ${filePath}`);
}

function main() {
  safetyCheck();
  console.log('[Product UX Agent] 推進到最佳 持續迭代');

  for (const filePath of taskOrder(process.env.PRODUCT_AGENT_TARGET_FILE)) {
    const updated = runTask(filePath);
    if (updated) {
      console.log(`[Product UX Agent] Updated ${updated} with real P1 UX improvements.`);
      return;
    }
  }

  console.log('[Product UX Agent] No safe P1 UX change needed.');
}

main();
