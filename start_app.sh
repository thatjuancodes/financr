#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/.logs"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
CLOUDFLARED_LOG="$LOG_DIR/cloudflared.log"

mkdir -p "$PID_DIR" "$LOG_DIR"
: > "$CLOUDFLARED_LOG"

if [ -f "$PID_DIR/backend.pid" ] || [ -f "$PID_DIR/frontend.pid" ] || [ -f "$PID_DIR/cloudflared.pid" ]; then
  echo "App appears to be running. Use ./restart_app.sh or ./kill_app.sh first."
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is required but was not found on PATH."
  echo "Install it first, for example with: brew install cloudflared"
  exit 1
fi

(
  cd "$ROOT_DIR/backend"
  pnpm install
  node src/migrate.js
)

(
  cd "$ROOT_DIR/frontend"
  pnpm install
)

open_terminal() {
  local cmd="$1"
  local escaped_cmd="${cmd//\\/\\\\}"
  escaped_cmd="${escaped_cmd//\"/\\\"}"

  /usr/bin/osascript <<EOF
tell application "Terminal"
  activate
  do script "$escaped_cmd"
end tell
EOF
}

open_terminal "cd \"$ROOT_DIR/backend\"; echo \\$\\$ > \"$PID_DIR/backend.pid\"; exec pnpm dev"
open_terminal "cd \"$ROOT_DIR/frontend\"; echo \\$\\$ > \"$PID_DIR/frontend.pid\"; exec pnpm dev"
open_terminal "cd \"$ROOT_DIR\"; exec ./run_cloudflared.sh"

public_url=""
for _ in $(seq 1 30); do
  if [ -f "$CLOUDFLARED_LOG" ]; then
    public_url=$(grep -Eo 'https://[-[:alnum:]]+\.trycloudflare\.com' "$CLOUDFLARED_LOG" | tail -n 1 || true)
    if [ -n "$public_url" ]; then
      break
    fi
  fi
  sleep 1
done

echo "Started backend, frontend, and cloudflared in new Terminal windows."
if [ -n "$public_url" ]; then
  echo "Public URL: $public_url"
else
  echo "Cloudflared is starting. Check $CLOUDFLARED_LOG for the public URL."
fi
