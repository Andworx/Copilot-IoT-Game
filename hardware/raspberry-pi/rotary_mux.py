"""CD74HC4067 16:1 mux scanner for the 12-position rotary switch.

Wiring: the rotary switch's common pole -> GND; each of its 12 contacts ->
one mux channel (C0-C11), channels C12-C15 unused. The mux's SIG pin -> a Pi
GPIO configured as input with an internal pull-up. Scanning selects each
channel in turn (S0-S3) and reads SIG: the channel currently connected to the
rotary's grounded common pole is electrically LOW; every other (floating)
channel is electrically HIGH via the pull-up passing straight through the mux.

SIG is read via PulledInput (pulled_input.py), not gpiozero's
DigitalInputDevice -- see that module's docstring for why: a confirmed
gpiozero 2.0.1.post3 LGPIOFactory bug means pull_up=True is recorded but
never actually applied, so an unconnected/floating pin reads permanently
LOW instead of HIGH. That bug affects every pulled input on this panel, not
just SIG.
"""
import time

from gpiozero import DigitalOutputDevice

from pulled_input import PulledInput

_SETTLE_SECONDS = 0.0002  # mux propagation delay after changing select lines


class RotaryMux:
    def __init__(self, select_pins, sig_pin, channels=12):
        self._select = [DigitalOutputDevice(pin) for pin in select_pins]
        self._sig = PulledInput(sig_pin)
        self._channels = channels

    def _select_channel(self, channel: int) -> None:
        for bit, line in enumerate(self._select):
            line.value = bool((channel >> bit) & 1)
        time.sleep(_SETTLE_SECONDS)

    def scan(self):
        """Returns the 0-based channel currently grounded by the rotary
        switch's common pole, or None if no channel reads active (the switch
        is resting between detents, or briefly mid-turn)."""
        for channel in range(self._channels):
            self._select_channel(channel)
            if self._sig.is_active:
                return channel
        return None

    def close(self):
        for line in self._select:
            line.close()
        self._sig.close()
