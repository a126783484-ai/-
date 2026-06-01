#!/usr/bin/env bash
set -euo pipefail

REPO="Johnnie1266789/beauty-os"
RUNNER_DIR="$HOME/actions-runner-beauty-os"
RUNNER_LABEL="beauty-os-vm"
RUNNER_NAME="beauty-os-vm-$(hostname)"

echo "===== stop stuck apt background update safely ====="
sudo pkill -9 -f "/usr/bin/apt-get update" 2>/dev/null || true
sudo pkill -9 -f "/usr/lib/apt/methods/" 2>/dev/null || true
sleep 2

echo "===== check required commands ====="
MISSING=0
for cmd in curl tar python3 git gh; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "MISSING: $cmd"
    MISSING=1
  else
    echo "OK: $cmd"
  fi
done

if [ "$MISSING" -ne 0 ]; then
  echo "Required command missing. Install the missing tool first, then rerun this script."
  echo "Most likely missing tool is gh. If apt is locked, wait for system updates to finish or install GitHub CLI manually."
  exit 1
fi

echo "===== github auth check ====="
if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI login required. Follow the URL and device code shown next."
  gh auth login -h github.com -s repo,workflow
fi

echo "===== prepare runner directory ====="
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

echo "===== download runner if needed ====="
if [ ! -f "./config.sh" ]; then
  VERSION="$(curl -fsSL https://api.github.com/repos/actions/runner/releases/latest | python3 -c 'import sys,json; print(json.load(sys.stdin)["tag_name"].lstrip("v"))')"
  echo "Runner version: $VERSION"
  curl -fL -o "actions-runner-linux-x64-${VERSION}.tar.gz" \
    "https://github.com/actions/runner/releases/download/v${VERSION}/actions-runner-linux-x64-${VERSION}.tar.gz"
  tar xzf "actions-runner-linux-x64-${VERSION}.tar.gz"
else
  echo "runner files already exist"
fi

echo "===== get runner token ====="
RUNNER_TOKEN="$(gh api -X POST "repos/${REPO}/actions/runners/registration-token" --jq .token)"

echo "===== configure runner ====="
export RUNNER_ALLOW_RUNASROOT=1
if [ -f ".runner" ]; then
  echo "runner already configured"
else
  ./config.sh \
    --unattended \
    --url "https://github.com/${REPO}" \
    --token "$RUNNER_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "$RUNNER_LABEL" \
    --work "_work"
fi

echo "===== install/start service ====="
sudo ./svc.sh install || true
sudo ./svc.sh start || true
sudo ./svc.sh status || true

echo "===== trigger VM health check ====="
gh workflow run vm-health-check.yml -R "$REPO" --ref main || true

echo "===== recent workflow runs ====="
sleep 8
gh run list -R "$REPO" -L 10 || true

echo "===== DONE ====="
