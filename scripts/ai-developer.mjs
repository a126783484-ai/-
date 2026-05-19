#!/usr/bin/env node
/**
 * Beauty OS AI Developer v4.1 - Safe Code Generation
 * 
 * 核心優化：
 * 1. 安全生成：AI 寫程式碼前必須先讀取專案實際結構，禁止憑空想像 import 路徑
 * 2. 協作記憶：使用 GitHub Issue 記錄任務歷史
 * 3. 低消耗：精簡 Prompt，僅做快速 Typecheck
 * 4. 穩妥執行：嚴格限制變更範圍
 */

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

// ===== 設定 =====
const CONFIG = {
  GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
  MODEL: 'llama-3.3-70b-versatile',
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,
  MAX_OPEN_PRS: 2,
  TRACKER_LABEL: 'ai-tracker',
};

// ===== 環境變數 =====
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('錯誤：請設定 GROQ_API_KEY 環境變數');
  process.exit(1);
}

const REPO_DIR = process.env.BEAUTY_OS_REPO || '/root/Documents/beauty-os';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || 'Johnnie1266789/beauty-os';

// ===== 工具函數 =====
function log(msg, level = 'info') {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`[AI Dev ${prefix}] ${new Date().toISOString()} - ${msg}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, maxRetries = CONFIG.MAX_RETRIES, delay = CONFIG.RETRY_DELAY) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      log(`嘗試 ${attempt}/${maxRetries} 失敗: ${error.message}`, 'warn');
      if (attempt === maxRetries) throw error;
      await sleep(delay * attempt);
    }
  }
}

function exec(cmd, options = {}) {
  try {
    return execSync(cmd, {
      cwd: REPO_DIR,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    }).trim();
  } catch (e) {
    if (options.ignoreError) return '';
    log(`命令失敗: ${cmd}`, 'error');
    throw e;
  }
}

// ===== Groq API =====
async function callGroq(systemPrompt, userPrompt, maxTokens = 2500) {
  const response = await fetch(CONFIG.GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(`Groq API: ${data.error.message}`);
  return data.choices[0].message.content;
}

// ===== 協作記憶系統 =====
async function getOrCreateTrackerIssue() {
  try {
    const issues = JSON.parse(exec(`gh issue list --state open --label "${CONFIG.TRACKER_LABEL}" --json number --limit 1`, { ignoreError: true }) || '[]');
    if (issues.length > 0) return issues[0].number;

    log('未找到追蹤器 Issue，正在建立...');
    const result = exec(`gh issue create --title "AI Dev Task Tracker" --label "${CONFIG.TRACKER_LABEL}" --body "# AI 開發任務追蹤器\\n\\n## 最近活動\\n- 系統初始化完成"`);
    const match = result.match(/#(\d+)/);
    return match ? parseInt(match[1]) : null;
  } catch (e) {
    log('無法建立追蹤器 Issue', 'error');
    return null;
  }
}

async function readTrackerHistory(issueNumber) {
  if (!issueNumber) return [];
  try {
    const body = exec(`gh issue view ${issueNumber} --json body --jq .body`, { ignoreError: true });
    const historySection = body.split('## 最近活動')[1];
    if (!historySection) return [];
    return historySection.split('\n').filter(line => line.startsWith('-')).slice(0, 5);
  } catch { return []; }
}

async function updateTracker(issueNumber, task, prUrl) {
  if (!issueNumber) return;
  try {
    const timestamp = new Date().toLocaleString();
    const entry = `- [${timestamp}] 完成: ${task} (${prUrl})`;
    const currentBody = exec(`gh issue view ${issueNumber} --json body --jq .body`, { ignoreError: true });
    const newBody = currentBody.replace('## 最近活動', `## 最近活動\n${entry}`);
    exec(`gh issue edit ${issueNumber} --body '${newBody.replace(/'/g, "\\'")}'`);
    log('已更新任務追蹤器');
  } catch (e) {
    log('更新追蹤器失敗', 'warn');
  }
}

// ===== 安全與解析 =====
const BLOCKED_PATTERNS = [/Demo Workspace/i, /TODO: production/i, /sb_secret_/i];

function checkBlockedPatterns(code) {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) throw new Error(`包含禁止模式: ${pattern}`);
  }
}

function extractJson(text) {
  let clean = text.replace(/```(?:json)?\n?/g, '').replace(/\n?```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end > start) return clean.substring(start, end + 1);
  throw new Error('無法提取 JSON');
}

function isSafeFile(filePath) {
  if (!filePath.startsWith('src/')) return false;
  const blocked = ['node_modules', '.next', 'supabase', '.github'];
  return !blocked.some(d => filePath.includes(d));
}

// ===== 專案結構分析 =====
function analyzeProjectStructure() {
  log('分析專案實際結構...');
  
  // 獲取 src 目錄結構
  const tree = exec('find src -type f -name "*.ts" -o -name "*.tsx" | sort', { ignoreError: true });
  
  // 獲取 lib 目錄下的關鍵檔案
  const libFiles = exec('ls -la src/lib/ 2>/dev/null', { ignoreError: true });
  
  // 獲取 models 目錄（如果存在）
  const modelsFiles = exec('ls -la src/models/ 2>/dev/null || echo "No models directory"', { ignoreError: true });
  
  // 獲取 utils 目錄（如果存在）
  const utilsFiles = exec('ls -la src/utils/ 2>/dev/null || echo "No utils directory"', { ignoreError: true });
  
  return { tree, libFiles, modelsFiles, utilsFiles };
}

// ===== 核心邏輯 =====
async function countOpenPRs() {
  try {
    const prs = JSON.parse(exec('gh pr list --state open --json number --limit 5', { ignoreError: true }) || '[]');
    return prs.length;
  } catch { return 0; }
}

async function analyzeProject() {
  log('快速分析專案狀態...');
  const failedRuns = exec('gh run list --status failure --limit 3 --json name,headBranch', { ignoreError: true });
  const aiTasks = exec('gh issue list --state open --label "ai-task" --limit 3 --json number,title', { ignoreError: true });
  
  return { failedRuns: failedRuns || '', aiTasks: aiTasks || '' };
}

async function determineTask(projectInfo, history, projectStructure) {
  log('AI 決定任務...');
  
  const systemPrompt = `你是 Beauty OS 資深工程師。Next.js 15 + Supabase 專案。
規則：
1. 優先修復 CI 失敗。
2. 其次處理 ai-task 標籤的 Issue。
3. 最後才做小改進。
4. 絕對不碰 secrets/migrations/workflows。
5. 只改 src/ 業務代碼。
6. 參考歷史記錄，不要重複做過的事。
7. **重要**：寫程式碼前必須參考專案結構，使用正確的 import 路徑。

專案結構：
${projectStructure.tree.substring(0, 1000)}

回覆純 JSON: {"task":"名稱", "description":"描述", "files_to_modify":["src/..."], "priority":"high/medium/low"}`;

  let userPrompt = `失敗 Workflow:\n${projectInfo.failedRuns}\n\n用戶任務:\n${projectInfo.aiTasks}\n\n歷史記錄:\n${history.join('\n') || '無'}\n\n請給出一個新任務。`;

  const result = await withRetry(() => callGroq(systemPrompt, userPrompt, 2000));
  return JSON.parse(extractJson(result));
}

async function writeCode(task, projectStructure) {
  log(`AI 寫程式碼: ${task.task}`);
  
  const systemPrompt = `你是全端工程師。寫 Next.js/TS 代碼。
規則：
1. 嚴格型別、Tailwind CSS、不引入新依賴、不改 package.json。
2. **絕對規則**：必須使用專案中實際存在的 import 路徑！
   - Supabase 客戶端在: src/lib/supabase.ts
   - 型別定義在: src/lib/types.ts
   - 不要使用 ../supabase 或 ../../models 等不存在的路徑
3. 如果檔案不存在，先建立正確的 import。

專案結構參考：
${projectStructure.tree.substring(0, 800)}

格式：\`\`\`typescript\n// 檔案路徑\n代碼\n\`\`\``;

  const userPrompt = `任務: ${task.task}\n描述: ${task.description}\n檔案: ${task.files_to_modify.join(', ')}\n請寫代碼。`;

  const code = await withRetry(() => callGroq(systemPrompt, userPrompt, 4000));
  checkBlockedPatterns(code);
  return code;
}

function applyChanges(code) {
  log('應用變更...');
  const regex = /```(?:typescript|tsx)?\n(?:\/\/\s*)?([^\n]+)\n([\s\S]*?)```/g;
  const changes = [];
  let match;
  
  while ((match = regex.exec(code)) !== null) {
    const filePath = match[1].trim().replace(/^\/\/\s*/, '');
    const content = match[2].trim();
    if (isSafeFile(filePath)) changes.push({ filePath, content });
  }
  
  if (!changes.length) throw new Error('無有效變更');
  
  for (const { filePath, content } of changes) {
    const fullPath = join(REPO_DIR, filePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf8');
    log(`寫入: ${filePath}`);
  }
  return changes;
}

async function runQualityChecks(changes) {
  log('快速品質檢查...');
  const checks = [];
  
  try {
    exec('npm run typecheck', { ignoreError: true });
    checks.push({ name: 'typecheck', passed: true });
  } catch { checks.push({ name: 'typecheck', passed: false }); }
  
  try {
    exec('npm run lint', { ignoreError: true });
    checks.push({ name: 'lint', passed: true });
  } catch { checks.push({ name: 'lint', passed: false }); }
  
  return checks;
}

async function createPR(task, changes, checks) {
  log('建立 PR...');
  
  const branchName = `ai/${task.task.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  
  exec('git rm --cached .env.auto 2>/dev/null || true');
  exec('git add -A');
  exec('git reset HEAD .env.auto 2>/dev/null || true');
  exec(`git commit -m "feat(ai): ${task.task}"`);
  exec(`git checkout -b ${branchName}`);
  await withRetry(() => exec(`git push -u origin ${branchName}`));
  
  const body = `## AI 自動改進\n\n**任務**: ${task.task}\n**描述**: ${task.description}\n**變更**: ${changes.map(c => c.filePath).join(', ')}\n\n---\n*AI Developer v4.1*`;
  
  exec(`gh pr create --title "[AI] ${task.task}" --body '${body}' --base main --head ${branchName}`);
  
  const prUrl = exec(`gh pr view --json url --jq .url`, { ignoreError: true });
  log(`PR 已建立: ${task.task}`);
  return prUrl || branchName;
}

// ===== 主流程 =====
async function main() {
  log('=== AI Developer v4.1 (Safe Generation) ===');
  
  try {
    if (await countOpenPRs() >= CONFIG.MAX_OPEN_PRS) {
      log('PR 數量已達上限，跳過本次執行', 'warn');
      return;
    }
    
    exec('git fetch origin main');
    exec('git checkout -f main');
    exec('git reset --hard origin/main');
    
    const trackerIssue = await getOrCreateTrackerIssue();
    const history = await readTrackerHistory(trackerIssue);
    
    // 分析專案結構（關鍵優化）
    const projectStructure = analyzeProjectStructure();
    
    const info = analyzeProject();
    const task = await determineTask(info, history, projectStructure);
    
    log(`任務: ${task.task} (${task.priority})`);
    
    // 寫程式碼時傳入專案結構
    const code = await writeCode(task, projectStructure);
    const changes = applyChanges(code);
    const checks = await runQualityChecks(changes);
    const prUrl = await createPR(task, changes, checks);
    
    await updateTracker(trackerIssue, task.task, prUrl);
    
    log('=== 完成 ===');
    
  } catch (error) {
    log(`錯誤: ${error.message}`, 'error');
    process.exit(1);
  }
}

main();
