"""Cable-matrix scanner and decoder for the four panel sockets.

Every wired socket contact (config.SOCKET_NODES) has its own GPIO. Cables only
bridge contacts to each other, nothing is tied to GND. To find the bridges the
scanner idles every node as an input with a pull-up, drives one node low at a
time, and reads the rest: any other node that follows it low is wired to it
through a cable. Only one node is ever driven, and only low, so a mis-plugged
cable cannot short two outputs together.

Cable identity comes from the four-cable build plan. Only mechanically matching
ends are considered. Both wires must be visible to identify a cable.
"""
import json
import time
from pathlib import Path
from itertools import permutations

import config

BUILD_PLAN = json.loads(Path(__file__).with_name("cable-build-plan.json").read_text())
CABLES = {c["id"]: c for c in BUILD_PLAN["cables"]}
SOCKET_TYPES = BUILD_PLAN["socketTypes"]

SCAN_SETTLE_S = 0.0002   # let a driven-low node pull its bridged partners down
CONFIRM_SCANS = 2        # identical consecutive scans needed to accept a change


def _signature(a_socket, b_socket, a_to_b, nodes):
    """Bridged node pairs a cable produces in one placement, or None if any
    wire lands on a contact that is not wired to a GPIO."""
    bridges = set()
    for a_pin, b_pin in a_to_b:
        a_node = (a_socket, a_pin)
        b_node = (b_socket, b_pin)
        if a_node not in nodes or b_node not in nodes:
            return None
        bridges.add(frozenset((a_node, b_node)))
    return frozenset(bridges)


def build_signature_table(socket_nodes=None):
    """Map each fully visible signature to the (cable, socket pair) that makes it.

    Returns (table, ambiguous). `ambiguous` holds signatures two different
    cables would both produce; they are left out of the table.
    """
    socket_nodes = socket_nodes or config.SOCKET_NODES
    nodes = {(s, p) for s, pins in socket_nodes.items() for p in pins}
    table, ambiguous = {}, set()
    for cable, definition in CABLES.items():
        for a_socket, b_socket in permutations(socket_nodes, 2):
            if [SOCKET_TYPES[a_socket], SOCKET_TYPES[b_socket]] != definition["ends"]:
                continue
            sig = _signature(a_socket, b_socket, definition["wires"], nodes)
            if sig is None:
                continue
            found = table.get(sig)
            if found is not None and found[0] != cable:
                ambiguous.add(sig)
            else:
                table[sig] = (cable, tuple(sorted((a_socket, b_socket))))
    for sig in ambiguous:
        table.pop(sig, None)
    return table, ambiguous


class LgpioBackend:
    """Drives and reads the socket nodes with raw lgpio (see pulled_input.py for
    why gpiozero is avoided for pulled-up inputs)."""

    def __init__(self, pins):
        import lgpio
        self._lgpio = lgpio
        self._chip = lgpio.gpiochip_open(0)
        self._pins = list(pins)
        for pin in self._pins:
            self._claim_input(pin)

    def _claim_input(self, pin):
        self._lgpio.gpio_claim_input(self._chip, pin, self._lgpio.SET_PULL_UP)

    def release(self, pin):
        """Back to the idle state: input with the internal pull-up."""
        self._lgpio.gpio_free(self._chip, pin)
        self._claim_input(pin)

    def drive_low(self, pin):
        self._lgpio.gpio_free(self._chip, pin)
        self._lgpio.gpio_claim_output(self._chip, pin, 0)

    def is_low(self, pin):
        return self._lgpio.gpio_read(self._chip, pin) == 0

    def close(self):
        for pin in self._pins:
            self._lgpio.gpio_free(self._chip, pin)
        self._lgpio.gpiochip_close(self._chip)


class CableMatrix:
    def __init__(self, backend=None, socket_nodes=None, sleep=time.sleep):
        self.socket_nodes = socket_nodes or config.SOCKET_NODES
        self._pin_of = {
            (s, p): gpio for s, pins in self.socket_nodes.items() for p, gpio in pins.items()
        }
        self._backend = backend or LgpioBackend(self._pin_of.values())
        self._sleep = sleep
        self._table, _ = build_signature_table(self.socket_nodes)
        self._pending = None
        self._pending_count = 0
        self._stable = ([], {s: False for s in self.socket_nodes})

    def scan_bridges(self):
        """One full pass. Returns a set of frozenset({node, node}) bridges."""
        bridges = set()
        for node, pin in self._pin_of.items():
            self._backend.drive_low(pin)
            self._sleep(SCAN_SETTLE_S)
            for other, other_pin in self._pin_of.items():
                if other != node and self._backend.is_low(other_pin):
                    bridges.add(frozenset((node, other)))
            self._backend.release(pin)
        return bridges

    def decode(self, bridges):
        """Turn bridges into ([{"cable", "sockets"}], {socket: plugged}).

        "cable" is None when the bridges match no catalogued cable (a wire
        missing from the cable, or a cable not in CABLES).
        """
        by_pair = {}
        for bridge in bridges:
            (s1, _), (s2, _) = sorted(bridge)
            by_pair.setdefault(tuple(sorted((s1, s2))), set()).add(bridge)
        cables, plugged = [], {s: False for s in self.socket_nodes}
        for pair, pair_bridges in sorted(by_pair.items()):
            for socket in pair:
                plugged[socket] = True
            match = self._table.get(frozenset(pair_bridges))
            cables.append({
                "cable": match[0] if match else None,
                "sockets": list(pair),
            })
        return cables, plugged

    def read(self):
        """Debounced (cables, plugged): a new reading is accepted after
        CONFIRM_SCANS identical scans in a row."""
        bridges = self.scan_bridges()
        if bridges == self._pending:
            self._pending_count += 1
        else:
            self._pending, self._pending_count = bridges, 1
        if self._pending_count >= CONFIRM_SCANS:
            self._stable = self.decode(bridges)
        return self._stable

    def close(self):
        self._backend.close()
