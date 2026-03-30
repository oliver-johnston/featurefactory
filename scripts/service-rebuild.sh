#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Rebuilding Feature Factory ==="
"$SCRIPT_DIR/install.sh"

echo ""
echo "=== Restarting service ==="
systemctl --user restart feature-factory
echo "[service] Restarted feature-factory"

echo ""
systemctl --user status feature-factory --no-pager || true
