#!/usr/bin/env bash
# Beauty OS 自動開發推進腳本 (AI 驅動版)
set -euo pipefail

REPO_DIR="${BEAUTY_OS_REPO:-/root/Documents/beauty-os}"
LOG_FILE="${BEAUTY_OS_LOG:-/var/log/beauty-os-auto-dev.log}"
TASK_INTERVAL="${TASK_INTERVAL:-1800}" # 30 分鐘執行一次

# 載入環境變數
ENV_FILE="$REPO_DIR/.env.auto"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
export GROQ_API_KEY="${GROQ_API_KEY:?GROQ_API_KEY is required}"
export GITHUB_TOKEN REPO_DIR LOG_FILE

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# AI 開發循環
ai_dev_cycle() {
  log "=== AI 開發循環開始 ==="
  
  cd "$REPO_DIR"
  
  # 確保基於最新 main
  git fetch origin main >/dev/null 2>&1
  git checkout main >/dev/null 2>&1
  
  # 執行 AI 開發者
  node scripts/ai-developer.mjs 2>&1 | tee -a "$LOG_FILE"
  
  log "=== AI 開發循環結束 ==="
}

# Daemon 模式
run_daemon() {
  log "啟動 AI Daemon 模式，間隔：${TASK_INTERVAL}秒"
  
  while true; do
    ai_dev_cycle
    log "等待 ${TASK_INTERVAL}秒..."
    sleep "$TASK_INTERVAL"
  done
}

# 主程式
case "${1:-}" in
  --daemon)
    run_daemon
    ;;
  --once)
    ai_dev_cycle
    ;;
  *)
    ai_dev_cycle
    ;;
esac
