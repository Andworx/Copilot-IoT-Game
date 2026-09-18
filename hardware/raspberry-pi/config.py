"""Panel Pi GPIO pin map (BCM numbering).

See hardware/raspberry-pi/README.md for the full wiring diagram, parts list, and the
reasoning behind each pin choice. Targets a Raspberry Pi 4/400/3B+ using
gpiozero's default pin factory (RPi.GPIO / lgpio, whichever is installed).
"""

# Panel switches. All six switches are gameplay inputs and are mapped by
# each logic_maps/<slug>.json restore sequence.
SWITCH_PINS = {
    "SW1": 5,
    "SW2": 6,
    "SW3": 13,
    "SW4": 19,
    "SW5": 26,
    "SW6": 21,
}

# Panel lamps, mapped positionally to each mode's LED logic.
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

