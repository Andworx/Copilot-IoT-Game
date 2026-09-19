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
        for a, b in zip(cm.SIDE_A_PINS, cm.CABLES[cable])
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

    def test_all_twelve_cables_are_recognisable(self):
        table, _ = cm.build_signature_table()
        self.assertEqual({c for c, _ in table.values()}, set(cm.CABLES))


class DecodeTests(unittest.TestCase):
    def test_every_cable_in_every_visible_placement(self):
        nodes = {(s, p) for s, pins in config.SOCKET_NODES.items() for p in pins}
        checked = 0
        for cable in cm.CABLES:
            for a_socket in config.SOCKET_NODES:
                for b_socket in config.SOCKET_NODES:
                    if a_socket == b_socket:
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
        self.assertGreater(checked, 12 * 3)

    def test_cables_with_b_pin_3_or_4_need_b_in_j1(self):
        # B pins 3/4 are only wired on J1, so B anywhere else is not seen.
        m = matrix_for(plug(1, "J2", "J3"))
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [])
        self.assertFalse(any(plugged.values()))

    def test_two_cables_at_once(self):
        m = matrix_for(plug(4, "J2", "J3") | plug(1, "J4", "J1"))
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(
            sorted(cables, key=lambda c: c["cable"]),
            [{"cable": 1, "sockets": ["J1", "J4"]}, {"cable": 4, "sockets": ["J2", "J3"]}],
        )
        self.assertTrue(all(plugged.values()))

    def test_partial_wire_reports_unknown_cable(self):
        m = matrix_for(set(list(plug(4, "J2", "J3"))[:1]))
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [{"cable": None, "sockets": ["J2", "J3"]}])
        self.assertTrue(plugged["J2"] and plugged["J3"])

    def test_empty_panel(self):
        m = matrix_for(set())
        cables, plugged = m.decode(m.scan_bridges())
        self.assertEqual(cables, [])
        self.assertFalse(any(plugged.values()))


class DebounceTests(unittest.TestCase):
    def test_change_needs_confirm_scans(self):
        m = matrix_for(set())
        self.assertFalse(any(m.read()[1].values()))
        m._backend.wires |= plug(4, "J2", "J3")
        _, plugged = m.read()
        self.assertFalse(plugged["J2"])          # first sighting: not accepted yet
        cables, plugged = m.read()
        self.assertTrue(plugged["J2"])
        self.assertEqual(cables, [{"cable": 4, "sockets": ["J2", "J3"]}])


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
