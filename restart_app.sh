#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

"$ROOT_DIR/kill_app.sh"
"$ROOT_DIR/start_app.sh"
