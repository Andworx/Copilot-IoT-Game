#!/usr/bin/env bash
# Idempotent bootstrap for the iotdisplay Pi: installs cage, gates on real
# time before the kiosk starts, installs and enables the kiosk + watchdog
# systemd units, and frees tty1/seat0 from lightdm so the kiosk unit can own
# them directly. Safe to re-run after a redeploy.
#
# This REPLACES the Pi's existing full-desktop autologin (lightdm ->
# rpd-labwc) with a minimal cage-only kiosk session, per issue #104's
# "no desktop shell" requirement. lightdm is disabled, not removed -- see
# README.md "Recovering a blank or stuck screen" to roll back.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Installing cage (kiosk Wayland compositor)"
sudo apt-get update
sudo apt-get install -y cage

echo "==> Enabling systemd-time-wait-sync.service (see README: why the time-sync line matters)"
sudo systemctl enable systemd-time-wait-sync.service

echo "==> Installing systemd units"
sudo cp "$SCRIPT_DIR/systemd/iotdisplay-kiosk.service" /etc/systemd/system/
sudo cp "$SCRIPT_DIR/systemd/iotdisplay-kiosk-watchdog.service" /etc/systemd/system/
sudo cp "$SCRIPT_DIR/systemd/iotdisplay-kiosk-watchdog.timer" /etc/systemd/system/
sudo systemctl daemon-reload

echo "==> Disabling lightdm (frees tty1/seat0 for the kiosk unit)"
echo "    Rollback: sudo systemctl disable --now iotdisplay-kiosk.service && sudo systemctl enable --now lightdm"
sudo systemctl disable --now lightdm || true

echo "==> Enabling kiosk + watchdog units"
sudo systemctl enable --now iotdisplay-kiosk.service
sudo systemctl enable --now iotdisplay-kiosk-watchdog.timer

echo "==> Done. Tail logs with: journalctl -u iotdisplay-kiosk.service -f"
