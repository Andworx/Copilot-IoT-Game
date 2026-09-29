"""Off-Pi tests for cable_matrix. Run from hardware/raspberry-pi:
    python -m unittest test_cable_matrix -v
Uses a fake GPIO backend, so lgpio is not needed."""
import json
import re
import unittest
from pathlib import Path

import cable_matrix as cm
import config


class FakeBackend:
    """Nodes idle high. A driven-low node pulls every node wired to it low."""

    def __init__(self, socket_nodes, wires):
        self._node_of = {g: (s, p) for s, pins in socket_nodes.items() for p, g in pins.items()}
        self.wires = wires   # set of frozenset({node, node}); mutable
        self._driven = None

    def release(self, pin):
        self._driven = None

    def drive_low(self, pin):
        self._driven = self._node_of[pin]

    def is_low(self, pin):
        node = self._node_of[pin]
        return self._driven is not None and frozenset((self._driven, node)) in self.wires

    def close(self):
        pass


def plug(cable, a_socket, b_socket):
    table, _ = cm.build_signature_table({a_socket: config.SOCKET_NODES[a_socket], b_socket: config.SOCKET_NODES[b_socket]})
    for signature, (cable_id, sockets) in table.items():
        if cable_id == cable and set(sockets) == {a_socket, b_socket}:
            return set(signature)
    return set()


def link(a_socket, b_socket):
    return plug(1, a_socket, b_socket)


def matrix_for(wires):
    backend = FakeBackend(config.SOCKET_NODES, wires)
    return cm.CableMatrix(backend=backend, sleep=lambda _s: None)


class SignatureTableTests(unittest.TestCase):
    def test_all_gpios_unique(self):
        gpios = [g for pins in config.SOCKET_NODES.values() for g in pins.values()]
        self.assertEqual(len(gpios), len(set(gpios)))

    def test_no_two_cables_share_a_signature(self):
        _table, ambiguous = cm.build_signature_table()
        self.assertEqual(ambiguous, set())

    def test_standard_patch_cable_is_recognisable(self):
        table, _ = cm.build_signature_table()
        self.assertEqual({c for c, _ in table.values()}, {1})


class DecodeTests(unittest.TestCase):
    def test_every_socket_pair_is_a_visible_patch_link(self):
        checked = 0
        sockets = list(config.SOCKET_NODES)
        for index, a_socket in enumerate(sockets):
            for b_socket in sockets[index + 1:]:
                m = matrix_for(link(a_socket, b_socket))
                cables, plugged = m.decode(m.scan_bridges())
                self.assertEqual(cables, [{"cable": 1, "sockets": sorted((a_socket, b_socket))}])
                self.assertEqual(sum(plugged.values()), 2)
                checked += 1
        self.assertEqual(checked, 6)

    def test_self_short_is_unknown(self):
        m = matrix_for({frozenset((("S3", 1), ("S3", 1)))})
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [])
        self.assertFalse(any(plugged.values()))

    def test_two_cables_at_once(self):
        m = matrix_for(link("S1", "S2") | link("S4", "S3"))
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(
            sorted(cables, key=lambda c: c["cable"]),
            [{"cable": 1, "sockets": ["S1", "S2"]}, {"cable": 1, "sockets": ["S3", "S4"]}],
        )
        self.assertTrue(all(plugged.values()))

    def test_unlisted_contact_reports_no_link(self):
        m = matrix_for({frozenset((("S1", 4), ("S2", 4)))})
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [])
        self.assertFalse(any(plugged.values()))

    def test_empty_panel(self):
        m = matrix_for(set())
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [])
        self.assertFalse(any(plugged.values()))


class DebounceTests(unittest.TestCase):
    def test_change_needs_confirm_scans(self):
        m = matrix_for(set())
        self.assertFalse(any(m.read()[1].values()))
        m._backend.wires |= link("S1", "S2")
        _, plugged = m.read()
        self.assertFalse(plugged["S2"])          # first sighting: not accepted yet
        cables, plugged = m.read()
        self.assertTrue(plugged["S2"])
        self.assertEqual(cables, [{"cable": 1, "sockets": ["S1", "S2"]}])


class LogicMapTests(unittest.TestCase):
    """A cable is only seen when both ends are plugged in, so the sockets a mode
    needs connected must come in pairs (0, 2 or 4)."""

    def test_required_connected_sockets_are_even(self):
        maps = sorted((Path(__file__).parent / "logic_maps").glob("*.json"))
        checked = 0
        for path in maps:
            profile = json.loads(path.read_text(encoding="utf-8"))
            if not profile.get("isGameDevice", True):
                continue
            plugged = [
                s["physicalPin"]
                for s in profile["restoreSequence"]
                if re.match(r"^S[1-4]$", s["physicalPin"]) and s["target"]
            ]
            self.assertEqual(len(plugged) % 2, 0, (profile["slug"], plugged))
            checked += 1
        self.assertEqual(checked, 12)


if __name__ == "__main__":
    unittest.main()
