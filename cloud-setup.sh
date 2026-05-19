#!/usr/bin/env bash
# Beauty OS Cloud VM Setup Script (Updated with Webhook Server)
set -euo pipefail

echo "=== Beauty OS 雲端自動化設定開始 ==="

# 1. 安裝必要工具
echo "[1/6] 安裝必要工具..."
sudo apt update
sudo apt install -y git curl gh

# 2. 安裝 Node.js
echo "[2/6] 安裝 Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

# 3. 登入 GitHub
echo "[3/6] 請登入 GitHub..."
echo "請執行 'gh auth login' 並按照指示完成登入"
gh auth login --web

# 4. 克隆專案
echo "[4/6] 克隆專案..."
cd ~
if [ -d "beauty-os" ]; then
  cd beauty-os
  git pull
else
  git clone https://github.com/Johnnie1266789/beauty-os.git
  cd beauty-os
fi

# 5. 設定環境變數
echo "[5/6] 設定環境變數..."
cat > .env.auto << 'EOF'
GITHUB_TOKEN=$(gh auth token)
MAX_PR_PER_DAY=3
TASK_INTERVAL=3600
NODE_OPTIONS="--max-old-space-size=4096"
WEBHOOK_SECRET="beauty-os-secret-key-2026"
EOF

# 6. 建立控制腳本
cat > auto-control.sh << 'SCRIPT_EOF'
#!/usr/bin/env bash
REPO_DIR="$HOME/beauty-os"
SCRIPT="$REPO_DIR/scripts/auto-dev.sh"
PID_FILE="$REPO_DIR/.auto-dev.pid"
LOG_FILE="$HOME/beauty-os-auto-dev.log"

start_service() {
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "服務已在執行中 (PID: $pid)"
      return 0
    fi
  fi
  
  echo "啟動 Beauty OS 自動開發系統..."
  source "$REPO_DIR/.env.auto"
  export GITHUB_TOKEN MAX_PR_PER_DAY TASK_INTERVAL NODE_OPTIONS
  
  nohup bash "$SCRIPT" --daemon >> "$LOG_FILE" 2>&1 &
  local pid=$!
  echo "$pid" > "$PID_FILE"
  
  (crontab -l 2>/dev/null || true; echo "@reboot cd $REPO_DIR && bash auto-control.sh start >> $LOG_FILE 2>&1") | crontab -
  
  echo "服務已啟動 (PID: $pid)"
}

stop_service() {
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    kill "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "服務已停止"
  else
    echo "服務未在執行"
  fi
}

status_service() {
  if [ -f "$PID_FILE" ]; then
    local pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      echo "服務執行中 (PID: $pid)"
      tail -5 "$LOG_FILE"
    else
      echo "服務已停止"
    fi
  else
    echo "服務未在執行"
  fi
}

case "${1:-start}" in
  start) start_service ;;
  stop) stop_service ;;
  status) status_service ;;
  logs) tail -f "$LOG_FILE" ;;
  *) echo "用法: $0 {start|stop|status|logs}" ;;
esac
SCRIPT_EOF
chmod +x auto-control.sh

# 7. 設定 Webhook Server
echo "[6/6] 設定 Webhook 伺服器..."
cd ~/beauty-os
nohup node apps/webhook-server/index.js > webhook-server.log 2>&1 &
echo "Webhook Server started on port 3000"

# 設定開機啟動 Webhook
(crontab -l 2>/dev/null || true; echo "@reboot cd ~/beauty-os && node apps/webhook-server/index.js > webhook-server.log 2>&1") | crontab -

# 8. 啟動主服務
echo "=== 設定完成！正在啟動服務... ==="
bash auto-control.sh start

echo "=== 完成！ ==="
echo "你可以關閉 SSH 視窗，系統會持續在雲端執行。"
echo "隨時可以使用 'bash auto-control.sh status' 查看狀態。"
