#!/usr/bin/env bash
set -euo pipefail

REQUEST_FILE="${1:-.vm-commands/request.json}"
ACTION="${VM_ACTION:-}"

if [ -z "$ACTION" ] && [ -f "$REQUEST_FILE" ]; then
  ACTION="$(python3 - <<'PY'
import json, os
path = os.environ.get('REQUEST_FILE', '.vm-commands/request.json')
try:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(data.get('action', 'health'))
except Exception:
    print('health')
PY
)"
fi

ACTION="${ACTION:-health}"
OUT="vm-command-summary.md"

section() {
  printf '\n## %s\n\n' "$1" | tee -a "$OUT"
}

run_block() {
  local title="$1"
  shift
  section "$title"
  {
    echo '```text'
    "$@" 2>&1 || true
    echo '```'
  } | tee -a "$OUT"
}

: > "$OUT"
echo "# Beauty OS VM Command Bridge" | tee -a "$OUT"
echo "" | tee -a "$OUT"
echo "- Timestamp UTC: $(date -u '+%Y-%m-%dT%H:%M:%SZ')" | tee -a "$OUT"
echo "- Hostname: $(hostname)" | tee -a "$OUT"
echo "- User: $(whoami)" | tee -a "$OUT"
echo "- Action: ${ACTION}" | tee -a "$OUT"

case "$ACTION" in
  health)
    run_block "Disk" df -h
    run_block "Memory" free -h
    run_block "Uptime" uptime
    run_block "Runner service" bash -lc 'cd "$HOME/actions-runner-beauty-os" 2>/dev/null && sudo ./svc.sh status || true'
    ;;
  processes)
    run_block "AI and dev process names" bash -lc "ps -eo pid,ppid,user,stat,etime,comm,args | grep -Ei 'codex|hermes|opencode|claude|node|npm|pnpm|yarn|pm2|ollama|openrouter|groq|playwright|next|vercel|actions-runner|Runner.Listener|Runner.Worker' | grep -v grep"
    ;;
  runner-status)
    run_block "Runner service" bash -lc 'cd "$HOME/actions-runner-beauty-os" 2>/dev/null && sudo ./svc.sh status || true'
    run_block "Runner processes" bash -lc "ps -eo pid,ppid,user,stat,etime,comm,args | grep -Ei 'Runner.Listener|Runner.Worker|runsvc.sh|actions-runner' | grep -v grep"
    ;;
  repo-status)
    run_block "Working directory" pwd
    run_block "Git status" git status --short
    run_block "Current branch" git branch --show-current
    run_block "Recent commits" git log --oneline -10
    ;;
  system-services)
    run_block "tmux" bash -lc 'tmux ls 2>/dev/null || echo no-tmux'
    run_block "screen" bash -lc 'screen -ls 2>/dev/null || echo no-screen'
    run_block "pm2" bash -lc 'pm2 list 2>/dev/null || echo no-pm2'
    run_block "docker" bash -lc "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' 2>/dev/null || echo no-docker"
    ;;
  test-basic)
    run_block "Package scripts" bash -lc 'node -e "const p=require(\"./package.json\"); console.log(p.scripts||{})"'
    run_block "Lint" bash -lc 'npm run lint'
    run_block "Typecheck" bash -lc 'npm run typecheck'
    ;;
  *)
    echo "Unsupported action: ${ACTION}" | tee -a "$OUT"
    echo "Allowed actions: health, processes, runner-status, repo-status, system-services, test-basic" | tee -a "$OUT"
    exit 2
    ;;
esac

cat "$OUT" >> "$GITHUB_STEP_SUMMARY" 2>/dev/null || true
cat "$OUT"
