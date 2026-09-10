#!/usr/bin/env python3
"""Restore & Spin panel Pi controller.

Reads the 12-position dial, the 6 panel switches, and the 4 connector jacks;
evaluates the active device's logic_maps/<slug>.json ruleset; drives the 4
panel LEDs; and publishes state to Azure IoT Hub. See hardware/raspberry-pi/README.md
for the full wiring diagram, parts list, and design notes.
"""
import json
import logging
import os
import signal
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from gpiozero import LED

import config
import safe_eval
from pulled_input import PulledInput
from rotary_mux import RotaryMux
from telemetry import TelemetryClient

LOGIC_MAPS_DIR = Path(__file__).parent / "logic_maps"

SCAN_INTERVAL = 0.05        # seconds between full input scans
DIAL_CONFIRM_READS = 3      # consecutive matching mux scans before accepting a dial change
HEARTBEAT_INTERVAL = 30.0   # seconds between full-state heartbeats regardless of change
SELF_TEST_DURATION = 2.0    # seconds all LEDs stay lit during the SW6 self-test

log = logging.getLogger("panel_controller")


class PanelController:
    def __init__(self):
        self.switches = {
            name: PulledInput(pin) for name, pin in config.SWITCH_PINS.items()
        }
        self.leds = {name: LED(pin) for name, pin in config.LED_PINS.items()}
        self.connectors = {
            name: PulledInput(pin) for name, pin in config.CONNECTOR_PINS.items()
        }
        self.mux = RotaryMux(
            list(config.MUX_SELECT_PINS.values()),
            config.MUX_SIG_PIN,
            channels=config.MUX_CHANNEL_COUNT,
        )

        self.telemetry = TelemetryClient()
        self.logic_maps = self._load_logic_maps()

        self._dial_position = None
        self._dial_candidate = None
        self._dial_candidate_count = 0
        self._active_profile = None
        self._last_state_sent = None
        self._last_heartbeat = 0.0
        self._win_latched = False
        self._self_test_until = 0.0

    def _load_logic_maps(self):
        maps = {}
        for path in sorted(LOGIC_MAPS_DIR.glob("*.json")):
            with path.open(encoding="utf-8") as f:
                profile = json.load(f)
            maps[profile["dialPosition"]] = profile
        missing = set(range(1, config.MUX_CHANNEL_COUNT + 1)) - set(maps)
        if missing:
            log.warning("No logic_map for dial position(s): %s", sorted(missing))
        return maps

    def _read_switch_state(self):
        return {name: pin.is_active for name, pin in self.switches.items()}

    def _read_connector_state(self):
        return {name: pin.is_active for name, pin in self.connectors.items()}

    def _apply_profile(self, profile, raw_switches):
        pin_to_key = {s["physicalPin"]: s["key"] for s in profile["switches"]}
        state = {key: raw_switches.get(pin, False) for pin, key in pin_to_key.items()}
        win = safe_eval.evaluate(profile["win"], state)
        variables = dict(state)
        variables["win"] = win
        lamp_state = {
            lamp["physicalPin"]: safe_eval.evaluate(lamp["when"], variables)
            for lamp in profile["lamps"]
        }
        return state, win, lamp_state

    def _drive_leds(self, lamp_state):
        for pin_name, led in self.leds.items():
            (led.on if lamp_state.get(pin_name, False) else led.off)()

    def _self_test(self):
        log.info("Self-test: all LEDs on for %.1fs", SELF_TEST_DURATION)
        for led in self.leds.values():
            led.on()
        self._self_test_until = time.monotonic() + SELF_TEST_DURATION

    def _on_dial_change(self, dial_position):
        log.info("Dial changed to position %d", dial_position)
        self._dial_position = dial_position
        self._active_profile = self.logic_maps.get(dial_position)
        self._win_latched = False
        self._last_state_sent = None
        for led in self.leds.values():
            led.off()
        if self._active_profile is None:
            log.warning("No logic_map for dial position %d — LEDs held off.", dial_position)
        self.telemetry.publish(
            {
                "deviceSlug": self._active_profile.get("slug") if self._active_profile else None,
                "dialPosition": dial_position,
            },
            "dial_change",
        )

    def _on_rearm(self):
        log.info("SW5 pressed — re-arm / resync requested")
        self._win_latched = False
        self._last_state_sent = None  # forces a fresh state_change publish next loop

    def run(self):
        log.info(
            "Panel controller started. Watching dial + %d switches + %d connectors.",
            len(self.switches),
            len(self.connectors),
        )
        prev_sw5 = False
        prev_sw6 = False
        try:
            while True:
                loop_start = time.monotonic()

                # --- dial scan with software debounce ---
                reading = self.mux.scan()
                if reading is not None:
                    dial_position = reading + 1
                    if dial_position == self._dial_candidate:
                        self._dial_candidate_count += 1
                    else:
                        self._dial_candidate = dial_position
                        self._dial_candidate_count = 1
                    if (
                        self._dial_candidate_count >= DIAL_CONFIRM_READS
                        and dial_position != self._dial_position
                    ):
                        self._on_dial_change(dial_position)

                # --- SW5 / SW6 utility buttons (edge-triggered) ---
                raw_switches = self._read_switch_state()
                if raw_switches["SW5"] and not prev_sw5:
                    self._on_rearm()
                if raw_switches["SW6"] and not prev_sw6:
                    self._self_test()
                prev_sw5, prev_sw6 = raw_switches["SW5"], raw_switches["SW6"]

                if time.monotonic() < self._self_test_until:
                    time.sleep(max(0.0, SCAN_INTERVAL - (time.monotonic() - loop_start)))
                    continue

                # --- active device evaluation ---
                if self._active_profile is not None:
                    state, win, lamp_state = self._apply_profile(self._active_profile, raw_switches)
                    self._drive_leds(lamp_state)
                    connectors = self._read_connector_state()

                    payload_state = {
                        "deviceSlug": self._active_profile.get("slug", "demo-info"),
                        "dialPosition": self._dial_position,
                        "switches": state,
                        "lamps": {
                            lamp["key"]: lamp_state.get(lamp["physicalPin"], False)
                            for lamp in self._active_profile["lamps"]
                        },
                        "connectors": connectors,
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
        self.mux.close()
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
