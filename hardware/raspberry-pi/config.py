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

# Cable-matrix sockets. Each socket wires only the listed contacts, each to its
# own GPIO: {socket: {contact pin: BCM GPIO}}. Nothing on a socket goes to GND;
# cables are identified by which contacts they bridge (see cable_matrix.py and
# the README's "Cable matrix" section).
# S1 is a quad socket; S2/S3 are dual; S4 is a triple replacement.
# S4 wires triple contact 2 to GPIO3 and contact 3 to GPIO7 only.
SOCKET_NODES = {
    "S1": {1: 4, 2: 18, 3: 24, 4: 16},
    "S2": {1: 25, 2: 20},
    "S3": {1: 2, 2: 12},
    "S4": {2: 3, 3: 7},
}

