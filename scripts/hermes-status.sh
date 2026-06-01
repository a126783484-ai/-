#!/usr/bin/env bash
set -euo pipefail

OUT="hermes-status-summary.md"
REPORT_PATH="reports/hermes-status-latest.md"
: > "$OUT"

section() {
  printf '\n## %s\n\n' "$1" | tee -a "$OUT"
}

block() {
  echo '```text' | tee -a "$OUT"
  "$@" 2>&1 | tee -a "$OUT" || true
  echo '```' | tee -a "$OUT"
}

echo "# Hermes Status Inspection" | tee -a "$OUT"
echo "" | tee -a "$OUT"
echo "- Timestamp UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')" | tee -a "$OUT"
echo "- Hostname: $(hostname)" | tee -a "$OUT"
echo "- User: $(whoami)" | tee -a "$OUT"

section "Hermes / AI process scan"
block bash -lc "ps -eo pid,ppid,user,stat,etime,comm | awk 'BEGIN{IGNORECASE=1} /hermes|codex|opencode|claude|openrouter|groq|ollama|node|npm|pnpm|yarn|pm2|playwright|Runner.Listener|Runner.Worker|runsvc.sh/ {print}'"

section "tmux sessions"
block bash -lc 'tmux ls 2>/dev/null || echo no-tmux'

section "screen sessions"
block bash -lc 'screen -ls 2>/dev/null || echo no-screen'

section "PM2 list"
block bash -lc 'pm2 list 2>/dev/null || echo no-pm2'

section "Docker containers"
block bash -lc "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' 2>/dev/null || echo no-docker"

section "Systemd AI-related services"
block bash -lc "systemctl --type=service --state=running --no-pager 2>/dev/null | grep -Ei 'hermes|codex|opencode|node|pm2|ollama|runner|n8n' || echo no-matching-services"

section "Runner service"
block bash -lc 'cd "$HOME/actions-runner-beauty-os" 2>/dev/null && sudo ./svc.sh status || echo runner-service-not-found'

cat "$OUT" >> "$GITHUB_STEP_SUMMARY" 2>/dev/null || true

mkdir -p "$(dirname "$REPORT_PATH")"
cp "$OUT" "$REPORT_PATH"

git config user.name "beauty-os-vm-runner"
git config user.email "actions@github.com"

git add "$REPORT_PATH"
if git diff --cached --quiet; then
  echo "No Hermes status report changes to commit."
else
  git commit -m "vm: update Hermes status report"
  git push
fi
