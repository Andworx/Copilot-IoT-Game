#!/usr/bin/env python3
"""Restore & Spin panel Pi controller.

Reads the 6 panel switches and scans the 4 cable sockets; applies the mode selected by
Power Apps/Page (or a local fallback); evaluates logic_maps/<slug>.json; drives
the 4 panel LEDs; and publishes state to Azure IoT Hub. See
hardware/raspberry-pi/README.md for the full wiring diagram and design notes.
"""
import json
import logging
import os
import signal
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
from gpiozero import LED

import config
import safe_eval
from cable_rules import cables_match
from cable_matrix import CableMatrix
from lamp_patterns import LampDriver, evaluate_lamps
from pulled_input import PulledInput
from telemetry import TelemetryClient

LOGIC_MAPS_DIR = Path(__file__).parent / "logic_maps"

SCAN_INTERVAL = 0.05        # seconds between full input scans
HEARTBEAT_INTERVAL = 30.0   # seconds between full-state heartbeats regardless of change
MODE_POLL_INTERVAL = 2.0    # seconds between Power App/Page mode checks
DEFAULT_MODE_SLUG = "thermostat"

BOOT_ALL_ON_SECONDS = 5.0   # all four LEDs lit at startup, before the chase
BOOT_CHASE_STEP_SECONDS = 0.3  # per-LED dwell time in the left-to-right boot chase
BOOT_CHASE_ORDER = ["LED1", "LED2", "LED3", "LED4"]  # left to right: blue, yellow, orange, green

log = logging.getLogger("panel_controller")


class PanelController:
    def __init__(self):
        self.switches = {
            name: PulledInput(pin) for name, pin in config.SWITCH_PINS.items()
        }
        self.leds = {name: LED(pin) for name, pin in config.LED_PINS.items()}
        self.lamp_driver = LampDriver(self.leds)
        self.cable_matrix = CableMatrix()

        self.telemetry = TelemetryClient()
        self.logic_maps = self._load_logic_maps()
        self.mode_state_url = os.environ.get("MODE_STATE_URL")
        self.mode_state_file = Path(os.environ.get("MODE_STATE_FILE", "active_mode.json"))
        self._mode_source_warning_sent = False
        if not self.mode_state_url and not os.environ.get("ACTIVE_DEVICE_SLUG") and not self.mode_state_file.exists():
            log.warning(
                "No MODE_STATE_URL, MODE_STATE_FILE, or ACTIVE_DEVICE_SLUG configured; "
                "panel will fall back to %s and kiosk telemetry for other modes will be ignored.",
                DEFAULT_MODE_SLUG,
            )
        self._next_mode_poll = 0.0

        self._active_profile = None
        self._active_slug = None
        self._last_state_sent = None
        self._last_heartbeat = 0.0
        self._win_latched = False

    def _load_logic_maps(self):
        maps = {}
        for path in sorted(LOGIC_MAPS_DIR.glob("*.json")):
            with path.open(encoding="utf-8") as f:
                profile = json.load(f)
            if not profile.get("isGameDevice", True):
                continue
            slug = profile["slug"]
            maps[slug] = profile
        if len(maps) != 12:
            log.warning("Expected 12 playable logic maps; found %d", len(maps))
        return maps

    def _read_switch_state(self):
        return {name: pin.is_active for name, pin in self.switches.items()}

    def _read_connector_state(self):
        """Returns (plugged, cables): per-socket presence for the restore logic,
        and the recognised cables ({"cable": n | None, "sockets": [...]})."""
        cables, plugged = self.cable_matrix.read()
        return plugged, cables

    def _read_mode_from_url(self):
        if not self.mode_state_url:
            return None
        try:
            with urllib.request.urlopen(self.mode_state_url, timeout=1.5) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (OSError, urllib.error.URLError, json.JSONDecodeError) as exc:
            log.warning("Mode state URL read failed: %s", exc)
            return None
        return payload.get("deviceSlug") or payload.get("slug")

    def _read_mode_from_file(self):
        if not self.mode_state_file.exists():
            return None
        try:
            text = self.mode_state_file.read_text(encoding="utf-8").strip()
            if not text:
                return None
            if text.startswith("{"):
                payload = json.loads(text)
                return payload.get("deviceSlug") or payload.get("slug")
            return text
        except (OSError, json.JSONDecodeError) as exc:
            log.warning("Mode state file read failed: %s", exc)
            return None

    def _current_requested_slug(self):
        return (
            self._read_mode_from_url()
            or self._read_mode_from_file()
            or os.environ.get("ACTIVE_DEVICE_SLUG")
            or self._active_slug
            or DEFAULT_MODE_SLUG
        )

    def _poll_mode_selection(self):
        now = time.monotonic()
        if now < self._next_mode_poll:
            return
        self._next_mode_poll = now + MODE_POLL_INTERVAL

        slug = self._current_requested_slug()
        if slug not in self.logic_maps:
            if not self._mode_source_warning_sent:
                log.warning("Requested mode '%s' is not available; keeping current mode", slug)
                self._mode_source_warning_sent = True
            return
        self._mode_source_warning_sent = False
        if slug != self._active_slug:
            self._on_mode_change(slug)

    def _apply_profile(self, profile, raw_switches, raw_connectors, cables):
        raw_controls = {**raw_switches, **raw_connectors}
        controls = profile.get("restoreSequence") or profile.get("switches", []) + profile.get("connectors", [])
        pin_to_key = {control["physicalPin"]: control["key"] for control in controls}
        state = {key: raw_controls.get(pin, False) for pin, key in pin_to_key.items()}
        win = safe_eval.evaluate(profile["win"], state) and cables_match(profile["requiredCables"], cables)
        variables = dict(state)
        variables["win"] = win
        lamp_states = evaluate_lamps(profile["lamps"], variables, restored=win)
        return state, win, lamp_states

    def _drive_leds(self, lamp_states):
        self.lamp_driver.apply(lamp_states)

    def _run_boot_animation(self):
        """All four LEDs on for BOOT_ALL_ON_SECONDS, then a left-to-right chase."""
        log.info("Boot animation: all LEDs on for %.0fs, then chase", BOOT_ALL_ON_SECONDS)
        for led in self.leds.values():
            led.on()
        time.sleep(BOOT_ALL_ON_SECONDS)
        for led in self.leds.values():
            led.off()
        for pin_name in BOOT_CHASE_ORDER:
            self.leds[pin_name].on()
            time.sleep(BOOT_CHASE_STEP_SECONDS)
            self.leds[pin_name].off()

    def _on_mode_change(self, slug):
        profile = self.logic_maps[slug]
        log.info("Mode changed to %s (%s)", slug, profile.get("label", slug))
        self._active_slug = slug
        self._active_profile = profile
        self._win_latched = False
        self._last_state_sent = None
        self.lamp_driver.reset()
        self.telemetry.publish(
            {
                "deviceSlug": slug,
                "modeIndex": profile.get("modeIndex"),
                "deviceName": profile.get("label"),
            },
            "mode_change",
        )

    def run(self):
        log.info(
            "Panel controller started. Watching Power App/Page mode + %d switches + %d cable sockets.",
            len(self.switches),
            len(config.SOCKET_NODES),
        )
        try:
            self._run_boot_animation()
            self.lamp_driver.reset()
            while True:
                loop_start = time.monotonic()
                self._poll_mode_selection()

                raw_switches = self._read_switch_state()
                raw_connectors, cables = self._read_connector_state()

                if self._active_profile is not None:
                    state, win, lamp_states = self._apply_profile(
                        self._active_profile,
                        raw_switches,
                        raw_connectors,
                        cables,
                    )
                    self._drive_leds(lamp_states)

                    payload_state = {
                        "deviceSlug": self._active_profile.get("slug"),
                        "deviceName": self._active_profile.get("label"),
                        "modeIndex": self._active_profile.get("modeIndex"),
                        "controls": state,
                        "rawSwitches": raw_switches,
                        "rawConnectors": raw_connectors,
                        "cables": cables,
                        "cableSchema": "panel-rj45-links/v1",
                        "lamps": {
                            lamp_state["key"]: lamp_state["active"]
                            for lamp_state in lamp_states.values()
                        },
                        "lampPatterns": {
                            lamp_state["key"]: {
                                "active": lamp_state["active"],
                                "pattern": lamp_state["pattern"],
                            }
                            for lamp_state in lamp_states.values()
                        },
                        "win": win,
                    }

                    newly_won = win and not self._win_latched
                    self._win_latched = win
                    now = time.monotonic()
                    changed = payload_state != self._last_state_sent
                    due_for_heartbeat = (now - self._last_heartbeat) >= HEARTBEAT_INTERVAL

                    if changed or due_for_heartbeat or newly_won:
                        event_type = "win" if newly_won else ("state_change" if changed else "heartbeat")
                        self.telemetry.publish(payload_state, event_type)
                        self._last_state_sent = payload_state
                        self._last_heartbeat = now

                elapsed = time.monotonic() - loop_start
                time.sleep(max(0.0, SCAN_INTERVAL - elapsed))
        except KeyboardInterrupt:
            pass
        finally:
            self._shutdown()

    def _shutdown(self):
        log.info("Shutting down — turning off all LEDs")
        for led in self.leds.values():
            led.off()
        self.cable_matrix.close()
        self.telemetry.close()


def main():
    load_dotenv()
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    controller = PanelController()
    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    controller.run()


if __name__ == "__main__":
    main()
