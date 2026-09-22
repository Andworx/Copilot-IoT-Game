"""Verify proposed builds against connector stock and wired socket contacts.

This tests the new design, not the legacy runtime decoder catalogue.
Only like connector types mate; no quad-to-dual adapters are assumed.
"""
import itertools
import json
from collections import Counter
from pathlib import Path
import unittest

PLAN = json.loads(Path(__file__).with_name("cable-build-plan.json").read_text())


def placements(cable):
    for pair in itertools.permutations(PLAN["socketTypes"], 2):
        if [PLAN["socketTypes"][s] for s in pair] != cable["ends"]:
            continue
        visible = frozenset(
            frozenset(((pair[0], a), (pair[1], b)))
            for a, b in cable["wires"]
            if a in PLAN["socketContacts"][pair[0]] and b in PLAN["socketContacts"][pair[1]]
        )
        yield pair, visible, len(visible) == len(cable["wires"])


def recipe(items):
    return frozenset((item["id"], tuple(sorted(item["sockets"]))) for item in items)


class CableBuildPlanTests(unittest.TestCase):
    def test_exact_spare_inventory_and_existing_cable_preserved(self):
        needed = Counter(end for c in PLAN["cables"] if not c["built"] for end in c["ends"])
        self.assertEqual(dict(needed), PLAN["spareConnectors"])
        c1 = PLAN["cables"][0]
        self.assertEqual((c1["id"], c1["built"], c1["ends"], c1["wires"]),
                         (1, True, ["quad", "dual"], [[3, 1], [4, 2]]))

    def test_every_build_has_valid_distinct_contacts(self):
        for cable in PLAN["cables"]:
            self.assertEqual(len(cable["wires"]), 2)
            for side, kind in enumerate(cable["ends"]):
                pins = [wire[side] for wire in cable["wires"]]
                self.assertEqual(len(set(pins)), 2)
                self.assertTrue(all(1 <= p <= (4 if kind == "quad" else 2) for p in pins))
            self.assertTrue(any(full for _, _, full in placements(cable)))

    def test_full_signatures_unique_and_partial_wires_never_match(self):
        known = {}
        partial = []
        for cable in PLAN["cables"]:
            for pair, signature, full in placements(cable):
                if full:
                    identity = (cable["id"], tuple(sorted(pair)))
                    self.assertIn(known.get(signature), (None, identity))
                    known[signature] = identity
                    partial.extend(signature - {wire} for wire in signature)
                else:
                    partial.append(signature)
        self.assertEqual(len(known), 9)
        self.assertTrue(all(signature not in known for signature in partial))

    def test_expected_placements(self):
        expected = {1: {("J1", "J2"), ("J1", "J3")},
                    2: {("J1", "J2"), ("J1", "J3"), ("J2", "J4"), ("J3", "J4")},
                    3: {("J1", "J4")}, 4: {("J1", "J2"), ("J1", "J3")}}
        for cable in PLAN["cables"]:
            self.assertEqual({tuple(sorted(pair)) for pair, _, full in placements(cable) if full}, expected[cable["id"]])

    def test_single_and_two_cable_arrangements_remain_distinguishable(self):
        candidates = {}
        for cable in PLAN["cables"]:
            for pair, signature, full in placements(cable):
                if full:
                    candidates[(cable["id"], tuple(sorted(pair)))] = signature
        observed = {}
        for count in (1, 2):
            for arrangement in itertools.combinations(candidates, count):
                ids = [item[0] for item in arrangement]
                sockets = [s for item in arrangement for s in item[1]]
                if len(set(ids)) != count or len(set(sockets)) != 2 * count:
                    continue
                signature = frozenset().union(*(candidates[item] for item in arrangement))
                self.assertNotIn(signature, observed)
                observed[signature] = frozenset(arrangement)
        required = {recipe(m["cables"]) for m in PLAN["modeUseCases"]}
        self.assertTrue(required.issubset(set(observed.values())))

    def test_all_modes_have_unique_physically_buildable_recipes(self):
        modes = PLAN["modeUseCases"]
        actual_modes = {json.loads(p.read_text())["slug"] for p in Path(__file__).with_name("logic_maps").glob("*.json")
                        if json.loads(p.read_text()).get("isGameDevice", True)}
        self.assertEqual({m["mode"] for m in modes}, actual_modes)
        self.assertEqual(len({recipe(m["cables"]) for m in modes}), 12)
        builds = {c["id"]: c for c in PLAN["cables"]}
        for mode in modes:
            occupied, used = set(), set()
            for item in mode["cables"]:
                self.assertNotIn(item["id"], used)
                used.add(item["id"])
                self.assertFalse(occupied.intersection(item["sockets"]))
                occupied.update(item["sockets"])
                self.assertTrue(any(set(pair) == set(item["sockets"]) and full
                                    for pair, _, full in placements(builds[item["id"]])))


if __name__ == "__main__":
    unittest.main()
