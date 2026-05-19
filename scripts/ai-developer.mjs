#!/usr/bin/env node
/**
 * Beauty OS AI Developer
 * 使用 Groq API 自動分析專案並寫程式碼
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('錯誤：請設定 GROQ_API_KEY 環境變數');
  process.exit(1);
}
const REPO_DIR = process.env.BEAUTY_OS_REPO || '/root/Documents/beauty-os';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPOSITORY || 'Johnnie1266789/beauty-os';

// Groq API 設定
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

// 日誌函數
function log(msg) {
  console.log(`[AI Dev] ${new Date().toISOString()} - ${msg}`);
}

// 執行 shell 命令
function exec(cmd) {
  try {
    return execSync(cmd, { cwd: REPO_DIR, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    return e.stdout || '';
  }
}

// 呼叫 Groq API
async function callGroq(systemPrompt, userPrompt) {
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
      max_tokens: 4000
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

// 分析專案結構
function analyzeProject() {
  log('分析專案結構...');
  
  const files = exec('find src -name "*.ts" -o -name "*.tsx" | head -20');
  const recentCommits = exec('git log --oneline -5');
  const openPRs = exec('gh pr list --state open --json number,title | head -50');
  
  return {
    files: files.trim(),
    recentCommits: recentCommits.trim(),
    openPRs: openPRs.trim()
  };
}

// 找出需要改進的地方
async function findImprovements(projectInfo) {
  log('AI 分析需要改進的地方...');
  
  const systemPrompt = `你是 Beauty OS 專案的資深工程師。請分析專案並找出 1-2 個可以立即改進的地方。
專案是 Next.js + Supabase 的美業 SaaS 系統。
請只回覆 JSON 格式，不要其他文字：
{
  "task": "任務名稱",
  "description": "詳細描述",
  "files_to_modify": ["檔案路徑"],
  "priority": "high/medium/low"
}`;

  const userPrompt = `專案資訊：
檔案列表：
${projectInfo.files}

最近提交：
${projectInfo.recentCommits}

開放 PR：
${projectInfo.openPRs}

請找出最值得做的改進任務。`;

  const result = await callGroq(systemPrompt, userPrompt);
  return JSON.parse(result);
}

// AI 寫程式碼
async function writeCode(task) {
  log(`AI 開始寫程式碼：${task.task}`);
  
  const systemPrompt = `你是資深 full-stack 工程師，專精 Next.js、TypeScript、Supabase。
請根據任務描述寫出完整的程式碼變更。
回覆格式：
\`\`\`typescript
// 檔案路徑
// 完整程式碼
\`\`\`

規則：
1. 保持現有程式碼風格
2. 加入適當的錯誤處理
3. 使用 TypeScript 型別
4. 不要破壞現有功能`;

  const userPrompt = `任務：${task.task}
描述：${task.description}
需要修改的檔案：${task.files_to_modify.join(', ')}

請寫出完整的程式碼。`;

  const code = await callGroq(systemPrompt, userPrompt);
  return code;
}

// 應用程式碼變更
function applyChanges(code, task) {
  log('應用程式碼變更...');
  
  // 解析程式碼區塊
  const codeBlocks = code.match(/```(?:typescript|tsx)?\n\/\/ (.+?)\n([\s\S]*?)```/g) || [];
  
  for (const block of codeBlocks) {
    const match = block.match(/\/\/ (.+?)\n([\s\S]*)/);
    if (!match) continue;
    
    const filePath = match[1].trim();
    const content = match[2].trim();
    const fullPath = join(REPO_DIR, filePath);
    
    // 確保目錄存在
    const dir = join(REPO_DIR, filePath.split('/').slice(0, -1).join('/'));
    execSync(`mkdir -p "${dir}"`);
    
    writeFileSync(fullPath, content);
    log(`已寫入：${filePath}`);
  }
}

// 建立 PR
async function createPR(task) {
  log('建立 Pull Request...');
  
  exec('git add -A');
  exec(`git commit -m "feat(ai): ${task.task}\\n\\nAI-generated improvement\\nTask: ${task.description}"`);
  
  const branchName = `ai-${task.task.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  exec(`git checkout -b ${branchName}`);
  exec(`git push -u origin ${branchName}`);
  
  const prBody = `## AI 自動改進

**任務**: ${task.task}
**描述**: ${task.description}
**優先級**: ${task.priority}

## 變更內容

- AI 分析並自動實作的改進
- 請人工審查後合併

---
*此 PR 由 Beauty OS AI Developer 自動建立*`;

  exec(`gh pr create --title "[AI] ${task.task}" --body "${prBody}" --base main --head ${branchName}`);
  
  log(`PR 已建立：${task.task}`);
}

// 主流程
async function main() {
  log('=== AI Developer 啟動 ===');
  
  try {
    // 1. 分析專案
    const projectInfo = analyzeProject();
    
    // 2. AI 找出改進任務
    const task = await findImprovements(projectInfo);
    log(`找到任務：${task.task} (優先級：${task.priority})`);
    
    // 3. AI 寫程式碼
    const code = await writeCode(task);
    
    // 4. 應用變更
    applyChanges(code, task);
    
    // 5. 建立 PR
    await createPR(task);
    
    log('=== 任務完成 ===');
  } catch (error) {
    log(`錯誤：${error.message}`);
    console.error(error);
  }
}

// 執行
main();
