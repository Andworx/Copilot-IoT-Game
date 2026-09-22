#!/usr/bin/env bash
# Runs as the sole client of `cage` (see systemd/iotdisplay-kiosk.service).
#
# Shows a local waiting page immediately, then swaps to the real kiosk URL
# once the network is up, the clock is synced, and the page actually
# responds. Ends with `exec chromium ...` so the final browser process
# becomes cage's direct child rather than a subprocess of this script --
# that way killing Chromium (a crash, or kiosk-watchdog.sh) ends cage too,
# and systemd's Restart=always on iotdisplay-kiosk.service re-enters this
# whole wait-and-reload cycle instead of needing separate reload logic.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && { set -a; source "$ENV_FILE"; set +a; }

KIOSK_URL="${KIOSK_URL:-https://copilotiotgame.powerappsportals.com/}"
PROFILE_DIR="${PROFILE_DIR:-$HOME/.config/kiosk-chromium}"
CDP_PORT="${CDP_PORT:-9222}"
WAITING_PAGE="file://$SCRIPT_DIR/waiting.html"

mkdir -p "$PROFILE_DIR"

# Dedicated, persistent profile (not --incognito/--guest) so a one-time
# interactive sign-in (see README "One-time sign-in bootstrap") survives
# reboots instead of prompting every launch.
CHROMIUM_FLAGS=(
  # Confirmed on real hardware: without this, Chromium's Ozone platform
  # auto-detect picks X11 and exits immediately ("Missing X server or
  # $DISPLAY") even though $WAYLAND_DISPLAY is set correctly for cage.
  --ozone-platform=wayland
  --kiosk
  --noerrdialogs
  --disable-infobars
  --disable-session-crashed-bubble
  --disable-translate
  --disable-features=Translate,TranslateUI
  --no-first-run
  --overscroll-history-navigation=0
  --check-for-update-interval=31536000
  --password-store=basic
  --disable-pinch
  --autoplay-policy=no-user-gesture-required
  --remote-debugging-port="$CDP_PORT"
  --user-data-dir="$PROFILE_DIR"
)

log() { echo "[kiosk-browser] $*"; }

patch_profile_prefs() {
  # Two fixes to the profile's Preferences before every launch:
  #  - exit_type/exit_code = Normal/0, so a hard kill (watchdog restart,
  #    power cut) never shows the "Chromium didn't shut down correctly"
  #    restore bubble.
  #  - session.restore_on_startup = 1 (restore last session). Confirmed on
  #    real hardware: without this, Chromium deletes session-only cookies
  #    (which is what the Entra ID sign-in cookie is) on every *clean* exit,
  #    silently logging the kiosk out on the very next restart even though
  #    the profile dir is persistent. Restore-on-startup mode is what tells
  #    Chromium to keep session cookies across a clean restart instead.
  local prefs="$PROFILE_DIR/Default/Preferences"
  [ -f "$prefs" ] || return 0
  python3 - "$prefs" <<'PY' 2>/dev/null
import json, sys
path = sys.argv[1]
try:
    with open(path) as f:
        data = json.load(f)
except (OSError, ValueError):
    sys.exit(0)
data.setdefault("profile", {})["exit_type"] = "Normal"
data["profile"]["exit_code"] = 0
data.setdefault("session", {})["restore_on_startup"] = 1
with open(path, "w") as f:
    json.dump(data, f)
PY
}

# 1. Show the local waiting page immediately so the panel is never blank.
patch_profile_prefs
chromium "${CHROMIUM_FLAGS[@]}" "$WAITING_PAGE" &
waiting_pid=$!

# 2. Wait for network + time sync + the real page, with backoff.
delays=(2 2 5 5 10 10 15 30)
i=0
while true; do
  online=0
  nmcli -t -f STATE g 2>/dev/null | grep -q "^connected$" && online=1

  synced=0
  [ "$(timedatectl show -p NTPSynchronized --value 2>/dev/null)" = "yes" ] && synced=1

  reachable=0
  if [ "$online" = 1 ] && [ "$synced" = 1 ] \
      && curl -sf -o /dev/null --max-time 5 "$KIOSK_URL"; then
    reachable=1
  fi

  [ "$reachable" = 1 ] && break

  log "waiting (online=$online synced=$synced reachable=$reachable)"
  delay="${delays[$i]}"
  [ "$i" -lt $((${#delays[@]} - 1)) ] && i=$((i + 1))
  sleep "$delay"
done

# 3. Swap the waiting page for the real kiosk page.
kill "$waiting_pid" 2>/dev/null
wait "$waiting_pid" 2>/dev/null
patch_profile_prefs
log "loading $KIOSK_URL"
exec chromium "${CHROMIUM_FLAGS[@]}" "$KIOSK_URL"
