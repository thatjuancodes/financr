#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/.logs"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
FRONTEND_URL="http://127.0.0.1:${FRONTEND_PORT}"
LOG_FILE="$LOG_DIR/cloudflared.log"

mkdir -p "$PID_DIR" "$LOG_DIR"
rm -f "$PID_DIR/cloudflared.pid"
: > "$LOG_FILE"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "Waiting for frontend at $FRONTEND_URL ..."
until curl -fsS "$FRONTEND_URL" >/dev/null; do
  sleep 1
done

echo "Starting cloudflared tunnel for $FRONTEND_URL"
echo "Tunnel logs: $LOG_FILE"

exec cloudflared tunnel \
  --no-autoupdate \
  --pidfile "$PID_DIR/cloudflared.pid" \
  --url "$FRONTEND_URL"
