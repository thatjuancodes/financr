#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"

kill_pid() {
  local pid_file="$1"
  local name="$2"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "Stopped $name (PID $pid)"
    fi
    rm -f "$pid_file"
  fi
}

kill_pid "$PID_DIR/backend.pid" "backend"
kill_pid "$PID_DIR/frontend.pid" "frontend"
kill_pid "$PID_DIR/cloudflared.pid" "cloudflared"

echo "Done."
