"""Raw-lgpio digital input with a working internal pull-up.

gpiozero 2.0.1.post3's LGPIOFactory has a confirmed bug (verified on real
hardware, 2026-09-07): a pull_up=True request is recorded correctly
(DigitalInputDevice.pin.pull reports "up") but never actually applied to the
underlying gpiochip line -- every input reads as permanently pulled toward
GND, floating or not, whether it's Button.is_pressed, DigitalInputDevice, or
the rotary mux's SIG line. Raw lgpio calls apply the same pull request
correctly (also verified: `lgpio.gpio_claim_input(h, pin, lgpio.SET_PULL_UP)`
reads back HIGH on a genuinely floating pin). Until that gpiozero bug is
fixed upstream, every panel input that depends on an internal pull -- the 6
switches, the 4 connector jacks, and the rotary mux's SIG line -- goes
through this thin wrapper instead of gpiozero's Button/DigitalInputDevice.

Outputs (LEDs, the mux's select lines) are unaffected by this bug -- an
output just drives the line directly, no pull configuration involved -- so
those still use gpiozero's LED/DigitalOutputDevice as normal.
"""
import lgpio

_CHIP = lgpio.gpiochip_open(0)


class PulledInput:
    """A GPIO input with an internal pull-up. `is_active` is True when the
    pin is pulled to GND -- a closed switch, a plugged-in cable, or (via
    RotaryMux) a grounded rotary contact."""

    def __init__(self, pin: int):
        self._pin = pin
        lgpio.gpio_claim_input(_CHIP, pin, lgpio.SET_PULL_UP)

    @property
    def is_active(self) -> bool:
        return lgpio.gpio_read(_CHIP, self._pin) == 0

    def close(self) -> None:
        lgpio.gpio_free(_CHIP, self._pin)
