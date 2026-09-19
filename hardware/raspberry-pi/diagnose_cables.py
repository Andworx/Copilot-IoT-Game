#!/usr/bin/env python3
"""Bench check for the cable-socket matrix, straight against the real GPIO.

Stop the panel service first (it holds the same GPIO lines):
    sudo systemctl stop restore-and-spin-panel.service
    .venv/bin/python3 diagnose_cables.py            # one scan
    .venv/bin/python3 diagnose_cables.py --watch    # keep scanning, print on change
    sudo systemctl start restore-and-spin-panel.service

Prints the raw bridges (which socket contacts are wired together through a cable)
and what cable_matrix.py decodes them as. With nothing plugged in, expect no bridges.
"""
import argparse
import time

import config
from cable_matrix import CableMatrix


def describe(matrix):
    bridges = matrix.scan_bridges()
    cables, plugged = matrix.decode(bridges)
    raw = sorted("%s pin %d <-> %s pin %d" % (*a, *b) for a, b in (sorted(x) for x in bridges))
    return raw, cables, plugged


def show(raw, cables, plugged):
    print("bridges:", raw or "none")
    print("cables: ", cables or "none")
    print("sockets:", {s: ("connected" if on else "open") for s, on in plugged.items()})


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--watch", action="store_true", help="scan repeatedly and print whenever it changes")
    args = parser.parse_args()

    gpios = sorted(g for pins in config.SOCKET_NODES.values() for g in pins.values())
    print("scanning %d socket contacts on GPIO %s" % (len(gpios), gpios))
    matrix = CableMatrix()
    try:
        last = None
        while True:
            raw, cables, plugged = describe(matrix)
            state = (raw, str(cables))
            if state != last:
                show(raw, cables, plugged)
                print()
                last = state
            if not args.watch:
                break
            time.sleep(0.2)
    except KeyboardInterrupt:
        pass
    finally:
        matrix.close()


if __name__ == "__main__":
    main()
