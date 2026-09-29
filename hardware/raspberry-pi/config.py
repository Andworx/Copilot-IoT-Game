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

# Cable-matrix sockets. Each RJ-45 panel jack wires one active contact to one
# GPIO. Nothing on a socket goes to GND; a standard straight-through RJ-45 patch
# cable bridges the active contact between the two connected ports (see
# cable_matrix.py and the README's "RJ-45 cable matrix" section).
SOCKET_NODES = {
    "S1": {1: 4},
    "S2": {1: 25},
    "S3": {1: 2},
    "S4": {2: 3},
}

