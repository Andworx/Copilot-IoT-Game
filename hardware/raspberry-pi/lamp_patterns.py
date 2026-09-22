"""Mode lamp evaluation and change-only GPIO driving (issue #102).

Kept independent of gpiozero so rules and timing can be tested off the Pi.
Patterns describe intent, not the instantaneous phase of a blinking output.
The controller/kiosk integration is tracked in MODE-DIFFERENTIATION-PLAN.md.
"""
import safe_eval

PATTERNS = {"on", "blink", "fast_blink"}
TIMINGS = {"blink": (0.5, 0.5), "fast_blink": (0.15, 0.15)}


def evaluate_lamps(lamps, variables, *, restored=False):
    """Return physical-pin keyed states; restored always means all solid.

    Missing pattern preserves legacy steady behavior. Invalid patterns and
    duplicate physical pins fail explicitly instead of silently misleading a
    participant. Existing restricted safe_eval remains the expression parser.
    """
    result = {}
    for lamp in lamps:
        pin = lamp["physicalPin"]
        pattern = lamp.get("pattern", "on")
        if pattern not in PATTERNS:
            raise ValueError(f"Unsupported lamp pattern: {pattern}")
        if pin in result:
            raise ValueError(f"Duplicate lamp pin: {pin}")
        enabled = safe_eval.evaluate(lamp["when"], variables)
        result[pin] = {
            "key": lamp["key"],
            "label": lamp["label"],
            "active": bool(restored or enabled),
            "pattern": "on" if restored else pattern,
        }
    return result


class LampDriver:
    """Start a blink only when its requested state changes.

    Calling blink every 50ms GPIO scan would restart it before the off phase.
    on/off cancel gpiozero's background blink when conditions or modes change.
    """

    def __init__(self, leds):
        self.leds = leds
        self._applied = {}

    def apply(self, states):
        for pin, led in self.leds.items():
            state = states.get(pin)
            pattern = state["pattern"] if state and state["active"] else "off"
            if pattern != "off" and pattern not in PATTERNS:
                raise ValueError(f"Unsupported lamp pattern: {pattern}")
            if self._applied.get(pin) == pattern:
                continue
            if pattern == "off":
                led.off()
            elif pattern == "on":
                led.on()
            else:
                on_time, off_time = TIMINGS[pattern]
                led.blink(on_time=on_time, off_time=off_time, background=True)
            self._applied[pin] = pattern

    def reset(self):
        """Cancel old-mode patterns and clear remembered output state."""
        for led in self.leds.values():
            led.off()
        self._applied.clear()
