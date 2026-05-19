#!/usr/bin/env node
/**
 * Beauty OS AI Developer v2.0 - Production Ready
 * 與監督系統完全兼容的 AI 自動開發引擎
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('錯誤：請設定 GROQ_API_KEY 環境變數');
  process.exit(1);
}

const REPO_DIR = process.env.BEAUTY_OS_REPO || '/root/Documents/beauty-os';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || 'Johnnie1266789/beauty-os';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function log(msg, level = 'info') {
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '✅';
  console.log(`[AI Dev ${prefix}] ${new Date().toISOString()} - ${msg}`);
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
    log(e.stderr || e.message, 'error');
    throw e;
  }
}

async function callGroq(systemPrompt, userPrompt, maxTokens = 4000) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: maxTokens
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(`Groq API 錯誤: ${data.error.message}`);
  return data.choices[0].message.content;
}

const BLOCKED_PATTERNS = [
  /Demo Workspace/i,
  /TODO: production/i,
  /sb_secret_/i,
  /SUPABASE_SERVICE_ROLE_KEY/i,
];

function checkBlockedPatterns(code) {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error(`程式碼包含被禁止的模式: ${pattern}`);
    }
  }
}

function getFileRisk(filePath) {
  const riskMap = [
    { pattern: /supabase\/migrations/, risk: 'migration', humanReview: true },
    { pattern: /supabase|secret|env/, risk: 'security', humanReview: true },
    { pattern: /workspace|tenant/, risk: 'tenant-isolation', humanReview: true },
    { pattern: /auth|login|session/, risk: 'auth', humanReview: true },
    { pattern: /staff|invite|member/, risk: 'staff-member', humanReview: true },
    { pattern: /\.github\/workflows|scripts\//, risk: 'infra', humanReview: true },
    { pattern: /src\/app.*\.(tsx|css)/, risk: 'ui', humanReview: false },
    { pattern: /error|logging|health/, risk: 'observability', humanReview: false },
  ];

  for (const { pattern, risk, humanReview } of riskMap) {
    if (pattern.test(filePath)) {
      return { risk, humanReview };
    }
  }
  return { risk: 'general', humanReview: false };
}

async function readCommandQueue() {
  log('讀取 AI Command Queue...');
  
  try {
    const issues = exec('gh issue list --state open --json number,title,body --limit 5', { ignoreError: true });
    if (!issues) return null;
    
    const queueIssue = JSON.parse(issues).find(i => 
      i.title.includes('AI Command Queue') || i.title.includes('Command Queue')
    );
    
    if (queueIssue) {
      log(`找到 Command Queue: #${queueIssue.number}`);
      return {
        number: queueIssue.number,
        title: queueIssue.title,
        body: queueIssue.body
      };
    }
  } catch (e) {
    log('無法讀取 Command Queue，將使用自主分析模式', 'warn');
  }
  
  return null;
}

function analyzeProject() {
  log('分析專案結構...');
  
  const files = exec('find src -name "*.ts" -o -name "*.tsx" | head -30', { ignoreError: true });
  const recentCommits = exec('git log --oneline -10', { ignoreError: true });
  const openPRs = exec('gh pr list --state open --json number,title,labels --limit 10', { ignoreError: true });
  const failedWorkflows = exec('gh run list --status failure --limit 5 --json name,conclusion', { ignoreError: true });
  
  return {
    files: files || '',
    recentCommits: recentCommits || '',
    openPRs: openPRs || '',
    failedWorkflows: failedWorkflows || ''
  };
}

async function determineTask(projectInfo, commandQueue) {
  log('AI 分析任務優先級...');
  
  const systemPrompt = `你是 Beauty OS 專案的資深工程師兼技術主管。
專案是 Next.js 15 + Supabase 的美業 SaaS 系統。

**絕對規則：**
1. 不碰 secrets、env 變數、migration 檔案
2. 不修改 .github/workflows 或 scripts/ 目錄
3. 不破壞現有功能
4. 只修改 src/ 目錄下的業務邏輯程式碼
5. 優先處理 failed workflows 相關的修復
6. 保持最小變更範圍

請只回覆 JSON 格式（不要包含 markdown code block）：
{
  "task": "任務名稱（簡短）",
  "description": "詳細任務描述",
  "files_to_modify": ["src/ 下的檔案路徑"],
  "priority": "high/medium/low",
  "risk_level": "low",
  "skip_if_human_review_needed": true
}`;

  let userPrompt = `專案狀態：
檔案列表：
${projectInfo.files}

最近提交：
${projectInfo.recentCommits}

開放 PR：
${projectInfo.openPRs}

失敗的 Workflows：
${projectInfo.failedWorkflows}`;

  if (commandQueue) {
    userPrompt += `\n\nAI Command Queue 內容：
${commandQueue.body.substring(0, 2000)}`;
  }

  userPrompt += '\n\n請找出最值得做的改進任務（優先修復 failed workflows 相關問題）。';

  const result = await callGroq(systemPrompt, userPrompt);
  
  // 處理可能包含 markdown code block 的回覆
  let jsonStr = result.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  return JSON.parse(jsonStr);
}

async function writeCode(task) {
  log(`AI 開始寫程式碼：${task.task}`);
  
  const systemPrompt = `你是資深 full-stack 工程師，專精 Next.js 15、React 19、TypeScript、Supabase。

**程式碼規範：**
1. 使用 TypeScript 嚴格型別
2. 加入適當的錯誤處理和 loading 狀態
3. 遵循現有程式碼風格
4. 使用 Tailwind CSS 進行樣式設計
5. 不引入新的依賴套件
6. 不修改 package.json

**回覆格式：**
\`\`\`typescript
// 檔案路徑（例如：src/app/dashboard/page.tsx）
完整程式碼內容
\`\`\`

**禁止事項：**
- 不包含 Demo Workspace、TODO: production 等被禁止的模式
- 不硬編碼 secrets 或 API keys
- 不修改 supabase/、.github/、scripts/ 目錄`;

  const userPrompt = `任務：${task.task}
描述：${task.description}
需要修改的檔案：${task.files_to_modify.join(', ')}

請寫出完整的程式碼變更。`;

  const code = await callGroq(systemPrompt, userPrompt, 6000);
  
  checkBlockedPatterns(code);
  
  return code;
}

function applyChanges(code, task) {
  log('應用程式碼變更...');
  
  const codeBlockRegex = /```(?:typescript|tsx|javascript|js)?\n(?:\/\/\s*)?([^\n]+)\n([\s\S]*?)```/g;
  const changes = [];
  let match;
  
  while ((match = codeBlockRegex.exec(code)) !== null) {
    const filePath = match[1].trim().replace(/^\/\/\s*/, '');
    const content = match[2].trim();
    
    if (!filePath.startsWith('src/')) {
      log(`跳過非 src/ 目錄的檔案: ${filePath}`, 'warn');
      continue;
    }
    
    changes.push({ filePath, content });
  }
  
  if (changes.length === 0) {
    throw new Error('AI 未產生有效的程式碼變更');
  }
  
  for (const { filePath, content } of changes) {
    const fullPath = join(REPO_DIR, filePath);
    const dir = dirname(fullPath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(fullPath, content, 'utf8');
    log(`已寫入：${filePath}`);
  }
  
  return changes;
}

async function runQualityChecks(changes) {
  log('執行品質檢查...');
  
  const checks = [];
  
  const hasTypeScript = changes.some(c => c.filePath.endsWith('.ts') || c.filePath.endsWith('.tsx'));
  if (hasTypeScript) {
    try {
      log('執行 TypeScript 型別檢查...');
      exec('npm run typecheck', { ignoreError: true });
      checks.push({ name: 'typecheck', passed: true });
    } catch (e) {
      checks.push({ name: 'typecheck', passed: false, error: e.stderr });
      log('TypeScript 型別檢查失敗', 'warn');
    }
  }
  
  try {
    log('執行 ESLint 檢查...');
    exec('npm run lint', { ignoreError: true });
    checks.push({ name: 'lint', passed: true });
  } catch (e) {
    checks.push({ name: 'lint', passed: false, error: e.stderr });
    log('ESLint 檢查失敗', 'warn');
  }
  
  try {
    log('執行 Build 檢查...');
    exec('npm run build', { ignoreError: true });
    checks.push({ name: 'build', passed: true });
  } catch (e) {
    checks.push({ name: 'build', passed: false, error: e.stderr });
    log('Build 檢查失敗', 'warn');
  }
  
  return checks;
}

async function createPR(task, changes, qualityChecks) {
  log('建立 Pull Request...');
  
  const risks = changes.map(c => getFileRisk(c.filePath));
  const needsHumanReview = risks.some(r => r.humanReview);
  const riskLabels = [...new Set(risks.map(r => r.risk))];
  
  const branchName = `ai/${task.task.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
  
  exec('git add -A');
  exec(`git commit -m "feat(ai): ${task.task}"`);
  exec(`git checkout -b ${branchName}`);
  exec(`git push -u origin ${branchName}`);
  
  const checksSummary = qualityChecks.map(c => 
    `${c.passed ? '✅' : '❌'} ${c.name}`
  ).join('\n');
  
  const riskSummary = riskLabels.map(r => `- ${r}`).join('\n');
  
  const prBody = `##  AI 自動改進

### 任務資訊
- **任務**: ${task.task}
- **描述**: ${task.description}
- **優先級**: ${task.priority}
- **風險等級**: ${needsHumanReview ? '🔴 需要人工審查' : '🟢 低風險'}

### 變更檔案
${changes.map(c => `- \`${c.filePath}\``).join('\n')}

### 風險標籤
${riskSummary}

### 品質檢查
${checksSummary}

### 審查建議
${needsHumanReview ? '⚠️ 此 PR 涉及高風險區域，請人工審查後再合併。' : '✅ 此 PR 為低風險變更，可考慮自動合併。'}

---
*此 PR 由 Beauty OS AI Developer v2.0 自動建立*
*遵循監督系統規則，未修改 secrets/migrations/workflows*`;

  exec(`gh pr create --title "[AI] ${task.task}" --body '${prBody}' --base main --head ${branchName}`);
  
  if (needsHumanReview) {
    const prNumber = exec('gh pr view --json number --jq .number');
    exec(`gh pr edit ${prNumber} --add-label "risk:${riskLabels[0]}"`);
  }
  
  log(`PR 已建立：${task.task}`);
  return branchName;
}

async function main() {
  log('=== AI Developer v2.0 啟動 ===');
  log(`倉庫: ${REPO}`);
  log(`目錄: ${REPO_DIR}`);
  
  try {
    log('切換到 main 分支...');
    exec('git fetch origin main');
    exec('git checkout main');
    exec('git reset --hard origin/main');
    
    const commandQueue = await readCommandQueue();
    const projectInfo = analyzeProject();
    const task = await determineTask(projectInfo, commandQueue);
    log(`任務確定: ${task.task} (優先級: ${task.priority})`);
    
    if (task.skip_if_human_review_needed) {
      const risks = task.files_to_modify.map(f => getFileRisk(f));
      if (risks.some(r => r.humanReview)) {
        log('任務涉及高風險區域，跳過自動執行', 'warn');
        return;
      }
    }
    
    const code = await writeCode(task);
    const changes = applyChanges(code, task);
    const qualityChecks = await runQualityChecks(changes);
    const branchName = await createPR(task, changes, qualityChecks);
    
    log('=== 任務完成 ===');
    log(`分支: ${branchName}`);
    log(`變更檔案: ${changes.length} 個`);
    log(`品質檢查: ${qualityChecks.filter(c => c.passed).length}/${qualityChecks.length} 通過`);
    
  } catch (error) {
    log(`錯誤: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

main();
