import itertools
import json
from pathlib import Path
import unittest

from cable_rules import cables_match
import safe_eval
from test_cable_matrix import link, matrix_for


class CableRuleTests(unittest.TestCase):
    def test_each_mode_accepts_its_required_rj45_links(self):
        profiles = [json.loads(p.read_text()) for p in Path(__file__).with_name("logic_maps").glob("*.json")]
        profiles = [p for p in profiles if p.get("isGameDevice", True)]
        for profile in profiles:
            wires = set()
            for c in profile["requiredCables"]:
                wires |= link(*c["sockets"])
            matrix = matrix_for(wires)
            cables, plugged = matrix.decode(matrix.scan_bridges())
            self.assertTrue(cables_match(profile["requiredCables"], cables), profile["slug"])
            wins = 0
            for values in itertools.product((False, True), repeat=6):
                raw = {**plugged, **dict(zip([f"SW{i}" for i in range(1, 7)], values))}
                state = {c["key"]: raw[c["physicalPin"]] for c in profile["restoreSequence"]}
                wins += safe_eval.evaluate(profile["win"], state) and cables_match(profile["requiredCables"], cables)
            self.assertEqual(wins, 1, profile["slug"])

    def test_invalid_readings_never_satisfy_recipe(self):
        required = [{"cable": 1, "sockets": ["S1", "S2"]}]
        for actual in (None, [], required * 2, [{"cable": None, "sockets": ["S1", "S2"]}],
                       [{"cable": 1, "sockets": ["S1", "S1"]}], [{"cable": True, "sockets": ["S1", "S2"]}],
                       [{"cable": 1, "sockets": ["S1", "S3"]}]):
            self.assertFalse(cables_match(required, actual))
        self.assertTrue(cables_match(required, [{"cable": 2, "sockets": ["S1", "S2"]}]))
        self.assertTrue(cables_match(required, [{"cable": 1, "sockets": ["S2", "S1"]}]))


if __name__ == "__main__":
    unittest.main()
