"""Verify the RJ-45 single-conductor cable plan."""
import itertools
import json
from pathlib import Path
import unittest

PLAN = json.loads(Path(__file__).with_name("cable-build-plan.json").read_text())


def recipe(items):
    return frozenset(tuple(sorted(item["sockets"])) for item in items)


class CableBuildPlanTests(unittest.TestCase):
    def test_rj45_socket_inventory(self):
        self.assertEqual(PLAN["schema"], "panel-rj45-links/v1")
        self.assertEqual(set(PLAN["socketTypes"].values()), {"rj45"})
        self.assertEqual(PLAN["socketContacts"], {"S1": [4], "S2": [4], "S3": [4], "S4": [4]})

    def test_standard_patch_cable_definition(self):
        self.assertEqual(len(PLAN["cables"]), 1)
        cable = PLAN["cables"][0]
        self.assertEqual(cable["id"], 1)
        self.assertEqual(cable["ends"], ["rj45", "rj45"])
        self.assertEqual(cable["wires"], [["active", "active"]])

    def test_every_socket_pair_has_a_unique_signature(self):
        signatures = {}
        sockets = list(PLAN["socketTypes"])
        for a_socket, b_socket in itertools.combinations(sockets, 2):
            signature = frozenset((a_socket, PLAN["socketContacts"][a_socket][0], b_socket, PLAN["socketContacts"][b_socket][0]))
            self.assertNotIn(signature, signatures)
            signatures[signature] = tuple(sorted((a_socket, b_socket)))
        self.assertEqual(len(signatures), 6)

    def test_all_modes_use_buildable_non_overlapping_links(self):
        modes = PLAN["modeUseCases"]
        actual_modes = {json.loads(p.read_text())["slug"] for p in Path(__file__).with_name("logic_maps").glob("*.json")
                        if json.loads(p.read_text()).get("isGameDevice", True)}
        self.assertEqual({m["mode"] for m in modes}, actual_modes)
        for mode in modes:
            occupied = set()
            for item in mode["cables"]:
                self.assertEqual(item["id"], 1)
                self.assertEqual(len(item["sockets"]), 2)
                self.assertTrue(set(item["sockets"]).issubset(PLAN["socketTypes"]))
                self.assertFalse(occupied.intersection(item["sockets"]))
                occupied.update(item["sockets"])

    def test_recipe_set_matches_current_design_capacity(self):
        recipes = {recipe(m["cables"]) for m in PLAN["modeUseCases"]}
        self.assertLessEqual(len(recipes), 9)
        self.assertTrue(all(1 <= len(item) <= 2 for item in recipes))


if __name__ == "__main__":
    unittest.main()
