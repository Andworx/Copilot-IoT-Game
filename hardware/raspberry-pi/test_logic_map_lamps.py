"""Off-Pi tests that each playable mode has its own LED story (issue #102).

Run from hardware/raspberry-pi: python -m unittest test_logic_map_lamps -v
"""
import json
import unittest
from pathlib import Path

import safe_eval
from lamp_patterns import PATTERNS, evaluate_lamps

LOGIC_MAPS_DIR = Path(__file__).parent / "logic_maps"


def _playable_profiles():
    profiles = {}
    for path in sorted(LOGIC_MAPS_DIR.glob("*.json")):
        profile = json.loads(path.read_text(encoding="utf-8"))
        if profile.get("isGameDevice", True):
            profiles[profile["slug"]] = profile
    return profiles


class LampScriptTests(unittest.TestCase):
    def setUp(self):
        self.profiles = _playable_profiles()

    def test_twelve_playable_modes_found(self):
        self.assertEqual(len(self.profiles), 12)

    def test_every_lamp_condition_only_uses_known_keys_and_win(self):
        for slug, profile in self.profiles.items():
            known = {s["key"] for s in profile["switches"]} | {c["key"] for c in profile["connectors"]} | {"win"}
            variables = {key: False for key in known}
            for lamp in profile["lamps"]:
                with self.subTest(slug=slug, lamp=lamp["key"]):
                    safe_eval.evaluate(lamp["when"], variables)  # raises on unknown key

    def test_every_lamp_pattern_is_supported(self):
        for slug, profile in self.profiles.items():
            for lamp in profile["lamps"]:
                with self.subTest(slug=slug, lamp=lamp["key"]):
                    self.assertIn(lamp.get("pattern", "on"), PATTERNS)

    def test_no_two_modes_share_an_identical_lamp_script(self):
        signatures = {}
        for slug, profile in self.profiles.items():
            sig = tuple(
                (lamp["physicalPin"], lamp["when"], lamp.get("pattern", "on"))
                for lamp in profile["lamps"]
            )
            self.assertNotIn(sig, signatures.values(), f"{slug} duplicates {signatures.get(sig)}")
            signatures[slug] = sig

    def test_some_modes_use_blink_or_fast_blink(self):
        patterns_used = {
            lamp.get("pattern", "on")
            for profile in self.profiles.values()
            for lamp in profile["lamps"]
        }
        self.assertTrue({"blink", "fast_blink"} & patterns_used)

    def test_win_lamp_is_green_and_solid_in_every_mode(self):
        for slug, profile in self.profiles.items():
            win_lamps = [lamp for lamp in profile["lamps"] if lamp["physicalPin"] == "LED4"]
            with self.subTest(slug=slug):
                self.assertEqual(len(win_lamps), 1)
                self.assertEqual(win_lamps[0]["when"], "win")
                self.assertEqual(win_lamps[0].get("pattern", "on"), "on")

    def test_restored_state_lights_all_four_lamps_solid(self):
        for slug, profile in self.profiles.items():
            known = {s["key"] for s in profile["switches"]} | {c["key"] for c in profile["connectors"]}
            variables = {key: False for key in known}
            variables["win"] = True
            with self.subTest(slug=slug):
                states = evaluate_lamps(profile["lamps"], variables, restored=True)
                self.assertEqual(len(states), 4)
                for state in states.values():
                    self.assertTrue(state["active"])
                    self.assertEqual(state["pattern"], "on")


if __name__ == "__main__":
    unittest.main()
