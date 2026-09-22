"""Off-Pi tests for cable_matrix. Run from hardware/raspberry-pi:
    python -m unittest test_cable_matrix -v
Uses a fake GPIO backend, so lgpio is not needed."""
import json
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
    return {
        frozenset(((a_socket, a), (b_socket, b)))
        for a, b in cm.CABLES[cable]["wires"]
    }


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

    def test_all_four_cables_are_recognisable(self):
        table, _ = cm.build_signature_table()
        self.assertEqual({c for c, _ in table.values()}, set(cm.CABLES))


class DecodeTests(unittest.TestCase):
    def test_every_cable_in_every_visible_placement(self):
        nodes = {(s, p) for s, pins in config.SOCKET_NODES.items() for p in pins}
        checked = 0
        for cable in cm.CABLES:
            for a_socket in config.SOCKET_NODES:
                for b_socket in config.SOCKET_NODES:
                    if a_socket == b_socket or [cm.SOCKET_TYPES[a_socket], cm.SOCKET_TYPES[b_socket]] != cm.CABLES[cable]["ends"]:
                        continue
                    wires = plug(cable, a_socket, b_socket)
                    if not all(n in nodes for w in wires for n in w):
                        continue
                    m = matrix_for(wires)
                    cables, plugged = m.decode(m.scan_bridges())
                    self.assertEqual(
                        cables,
                        [{"cable": cable, "sockets": sorted((a_socket, b_socket))}],
                        (cable, a_socket, b_socket),
                    )
                    self.assertEqual(sum(plugged.values()), 2)
                    checked += 1
        self.assertEqual(checked, 10)

    def test_cable_one_in_j4_is_partial_and_unknown(self):
        m = matrix_for(plug(1, "J4", "J2"))
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [{"cable": None, "sockets": ["J2", "J4"]}])
        self.assertTrue(plugged["J4"])

    def test_two_cables_at_once(self):
        m = matrix_for(plug(1, "J1", "J2") | plug(2, "J4", "J3"))
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(
            sorted(cables, key=lambda c: c["cable"]),
            [{"cable": 1, "sockets": ["J1", "J2"]}, {"cable": 2, "sockets": ["J3", "J4"]}],
        )
        self.assertTrue(all(plugged.values()))

    def test_partial_wire_reports_unknown_cable(self):
        m = matrix_for(set(list(plug(4, "J1", "J2"))[:1]))
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [{"cable": None, "sockets": ["J1", "J2"]}])
        self.assertTrue(plugged["J1"] and plugged["J2"])

    def test_empty_panel(self):
        m = matrix_for(set())
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [])
        self.assertFalse(any(plugged.values()))


class DebounceTests(unittest.TestCase):
    def test_change_needs_confirm_scans(self):
        m = matrix_for(set())
        self.assertFalse(any(m.read()[1].values()))
        m._backend.wires |= plug(4, "J1", "J2")
        _, plugged = m.read()
        self.assertFalse(plugged["J2"])          # first sighting: not accepted yet
        cables, plugged = m.read()
        self.assertTrue(plugged["J2"])
        self.assertEqual(cables, [{"cable": 4, "sockets": ["J1", "J2"]}])


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
                if s["physicalPin"].startswith("J") and s["target"]
            ]
            self.assertEqual(len(plugged) % 2, 0, (profile["slug"], plugged))
            checked += 1
        self.assertEqual(checked, 12)


if __name__ == "__main__":
    unittest.main()
