#!/bin/bash
set -e

SERVICE_NAME="feature-factory"
UNIT_DIR="$HOME/.config/systemd/user"
UNIT_PATH="$UNIT_DIR/$SERVICE_NAME.service"
STARTUP_SCRIPT_NAME="FeatureFactory-WSL.vbs"
WIN_SYSTEM32="/mnt/c/Windows/System32"

# 1. Stop and disable (ignore errors if not running)
systemctl --user stop "$SERVICE_NAME" 2>/dev/null || true
systemctl --user disable "$SERVICE_NAME" 2>/dev/null || true

# 2. Remove unit file
if [ -f "$UNIT_PATH" ]; then
  rm "$UNIT_PATH"
  echo "[service] Removed $UNIT_PATH"
fi

# 3. Reload systemd
systemctl --user daemon-reload

# 4. Remove Windows Startup script
WIN_APPDATA=$("$WIN_SYSTEM32/cmd.exe" /D /S /C "echo %APPDATA%" 2>/dev/null | tr -d '\r' || true)
if [ -n "$WIN_APPDATA" ]; then
  WSL_APPDATA=$(echo "$WIN_APPDATA" | sed 's|^\([A-Za-z]\):\\|/mnt/\L\1/|' | sed 's|\\|/|g')
  STARTUP_SCRIPT="$WSL_APPDATA/Microsoft/Windows/Start Menu/Programs/Startup/$STARTUP_SCRIPT_NAME"
  if [ -f "$STARTUP_SCRIPT" ]; then
    rm "$STARTUP_SCRIPT"
    echo "[service] Removed Windows Startup script"
  fi
else
  echo "[service] Warning: could not resolve APPDATA, skipping Windows Startup script removal"
fi

echo ""
echo "Feature Factory service uninstalled."
