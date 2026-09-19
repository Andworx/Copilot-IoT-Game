"""Raw-lgpio digital input with a working internal pull-up.

gpiozero 2.0.1.post3's LGPIOFactory has a confirmed bug (verified on real
hardware, 2026-09-07): a pull_up=True request is recorded correctly
(DigitalInputDevice.pin.pull reports "up") but never actually applied to the
underlying gpiochip line -- every input reads as permanently pulled toward
GND, floating or not, whether it's Button.is_pressed or DigitalInputDevice.
Raw lgpio calls apply the same pull request correctly (also verified:
`lgpio.gpio_claim_input(h, pin, lgpio.SET_PULL_UP)` reads back HIGH on a
genuinely floating pin). Until that gpiozero bug is fixed upstream, every
panel input that depends on an internal pull -- the 6 switches -- goes
through this thin wrapper instead of gpiozero's
Button/DigitalInputDevice. (The cable-socket nodes in cable_matrix.py use raw
lgpio directly for the same reason.)

Outputs (LEDs) are unaffected by this bug -- an output just drives the line
directly, no pull configuration involved -- so those still use gpiozero's LED
as normal.
"""
import lgpio

_CHIP = lgpio.gpiochip_open(0)


class PulledInput:
    """A GPIO input with an internal pull-up. `is_active` is True when the
    pin is pulled to GND -- a closed switch or a plugged-in cable."""

    def __init__(self, pin: int):
        self._pin = pin
        lgpio.gpio_claim_input(_CHIP, pin, lgpio.SET_PULL_UP)

    @property
    def is_active(self) -> bool:
        return lgpio.gpio_read(_CHIP, self._pin) == 0

    def close(self) -> None:
        lgpio.gpio_free(_CHIP, self._pin)
