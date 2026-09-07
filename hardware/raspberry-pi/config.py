"""Panel Pi GPIO pin map (BCM numbering).

See hardware/raspberry-pi/README.md for the full wiring diagram, parts list, and the
reasoning behind each pin choice. Targets a Raspberry Pi 4/400/3B+ using
gpiozero's default pin factory (RPi.GPIO / lgpio, whichever is installed).
"""

# Toggle switches. SW1-SW4 are read positionally into whichever device's
# switches[0..3] are active for the current dial position (see
# logic_maps/<slug>.json). SW5/SW6 are panel utility buttons, not part of any
# device's win/lamp logic.
SWITCH_PINS = {
    "SW1": 5,
    "SW2": 6,
    "SW3": 13,
    "SW4": 19,
    "SW5": 26,   # utility: re-arm / force telemetry resync
    "SW6": 21,   # utility: lamp self-test
}

# Panel lamps, mapped positionally to whichever device's lamps[0..3] are
# active. Single-color on/off LEDs — see README for how the on-screen
# off/green/amber/red states collapse to lit/unlit here.
LED_PINS = {
    "LED1": 17,
    "LED2": 27,
    "LED3": 22,
    "LED4": 23,
}

# Presence/continuity jacks (4 pins per socket, only 1 used per README). Each
# entry is the GPIO wired to that socket's signal pin; a cable plugged in
# bridges signal to the socket's ground pin, reading the GPIO LOW.
CONNECTOR_PINS = {
    "J1": 24,
    "J2": 25,
    "J3": 12,
    "J4": 16,
}

# CD74HC4067 16:1 mux scanning the 12-position rotary switch. EN is tied to
# GND in hardware (always enabled), so it isn't a GPIO here.
MUX_SELECT_PINS = {
    "S0": 4,
    "S1": 18,
    "S2": 20,
    "S3": 7,
}
MUX_SIG_PIN = 8
MUX_CHANNEL_COUNT = 12
