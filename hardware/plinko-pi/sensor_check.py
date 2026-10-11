"""Live bench check for Plinko IR break-beam receivers.

Prints one line whenever a receiver changes state, plus a periodic table, so
each sensor can be proven one at a time by blocking its beam. Needs only lgpio.

    python3 sensor_check.py                 # all pins in PLINKO_BUCKET_PINS
    python3 sensor_check.py --pins 17 27    # specific BCM pins
"""
import argparse
import time

import config


def parse_args():
    parser = argparse.ArgumentParser(description="Plinko break-beam live sensor check")
    parser.add_argument("--pins", type=int, nargs="+", default=config.DEFAULT_BUCKET_PINS, help="BCM pins, bucket 1..N")
    parser.add_argument("--poll-ms", type=int, default=5)
    parser.add_argument("--table-s", type=float, default=2.0, help="seconds between summary rows (0 = off)")
    return parser.parse_args()


def main() -> None:
    import lgpio

    args = parse_args()
    chip = lgpio.gpiochip_open(0)
    for pin in args.pins:
        try:
            lgpio.gpio_claim_input(chip, pin, lgpio.SET_PULL_UP)
        except lgpio.error as exc:
            raise SystemExit(
                f"GPIO{pin}: {exc}. Another process holds it. Stop another sensor check with: "
                "pkill -f '[s]ensor_check.py'; or stop the reporter with: "
                "sudo systemctl stop plinko-pi.service"
            )
    label = {pin: f"b{i + 1}/GPIO{pin}" for i, pin in enumerate(args.pins)}
    state = {pin: lgpio.gpio_read(chip, pin) for pin in args.pins}
    flips = {pin: 0 for pin in args.pins}
    blocked_at = {}
    start = time.monotonic()
    next_table = start + args.table_s

    def word(level):
        return "CLEAR  " if level else "BLOCKED"

    print("Active-low: BLOCKED = pin pulled to GND (beam broken). Ctrl+C to stop.")
    print("Initial:", "  ".join(f"{label[p]}={word(state[p])}" for p in args.pins))
    try:
        while True:
            now = time.monotonic()
            for pin in args.pins:
                level = lgpio.gpio_read(chip, pin)
                if level == state[pin]:
                    continue
                state[pin] = level
                flips[pin] += 1
                if level == 0:
                    blocked_at[pin] = now
                    print(f"{now - start:8.2f}s  {label[pin]:<14} BLOCKED")
                else:
                    held = now - blocked_at.pop(pin, now)
                    print(f"{now - start:8.2f}s  {label[pin]:<14} CLEAR (was blocked {held * 1000:.0f} ms)")
            if args.table_s and now >= next_table:
                next_table = now + args.table_s
                print("   --  " + "  ".join(f"{label[p]}={word(state[p])}({flips[p]})" for p in args.pins))
            time.sleep(args.poll_ms / 1000.0)
    except KeyboardInterrupt:
        pass
    finally:
        for pin in args.pins:
            lgpio.gpio_free(chip, pin)
        lgpio.gpiochip_close(chip)
        print("Flip counts:", {label[p]: flips[p] for p in args.pins})


if __name__ == "__main__":
    main()
