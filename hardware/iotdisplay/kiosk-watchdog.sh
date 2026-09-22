#!/usr/bin/env bash
# Triggered periodically by systemd/iotdisplay-kiosk-watchdog.timer. If
# Chromium's DevTools endpoint stops answering, the browser is hung or gone
# -- kill it so iotdisplay-kiosk.service's Restart=always brings the whole
# kiosk-browser.sh wait-and-reload cycle back (see that script for why this
# also recovers a network drop or a crashed tab, not just a hung process).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && { set -a; source "$ENV_FILE"; set +a; }

CDP_PORT="${CDP_PORT:-9222}"

if curl -sf --max-time 5 "http://127.0.0.1:$CDP_PORT/json/version" >/dev/null; then
  exit 0
fi

echo "[kiosk-watchdog] Chromium DevTools endpoint unresponsive on port $CDP_PORT -- restarting kiosk"
pkill -f "remote-debugging-port=$CDP_PORT" || true
