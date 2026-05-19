#!/usr/bin/env bash
# Beauty OS Cloud VM Setup Script
# 在 Google Cloud VM 上執行此腳本以設定自動開發系統
set -euo pipefail

echo "=== Beauty OS 雲端自動化設定開始 ==="

# 1. 安裝必要工具
echo "[1/5] 安裝必要工具 (Git, GitHub CLI, Curl)..."
sudo apt update
sudo apt install -y git curl gh

# 2. 安裝 Node.js (使用 NVM 安裝 LTS 版本)
echo "[2/5] 安裝 Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

# 3. 登入 GitHub (需要互動)
echo "[3/5] 請登入 GitHub..."
echo "請按照螢幕指示完成 gh auth login (選擇 HTTPS, 登入瀏覽器)"
gh auth login --web

# 4. 克隆專案
echo "[4/5] 克隆專案..."
cd ~
if [ -d "beauty-os" ]; then
  echo "專案已存在，更新中..."
  cd beauty-os
  git pull
else
  git clone https://github.com/Johnnie1266789/beauty-os.git
  cd beauty-os
fi

# 5. 設定環境變數
echo "[5/5] 設定環境變數..."
cat > .env.auto << 'EOF'
# Beauty OS Auto Dev Environment Variables
GITHUB_TOKEN=$(gh auth token)
MAX_PR_PER_DAY=3
TASK_INTERVAL=3600
NODE_OPTIONS="--max-old-space-size=4096"
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
  
  # 設定開機啟動
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

# 7. 啟動服務
echo "=== 設定完成！正在啟動服務... ==="
bash auto-control.sh start

echo "=== 完成！ ==="
echo "你可以關閉 SSH 視窗，系統會持續在雲端執行。"
echo "隨時可以使用 'bash auto-control.sh status' 查看狀態。"
