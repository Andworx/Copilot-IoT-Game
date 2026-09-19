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

# Cable-matrix sockets. Each 4-pin socket wires only the listed contacts, each
# to its own GPIO: {socket: {contact pin: BCM GPIO}}. Nothing on a socket goes
# to GND; cables are identified by which contacts they bridge (see
# cable_matrix.py and the README's "Cable matrix" section).
#   J1 is the only full quad socket, so it is the only socket that can take the
#   B end of a cable that uses B pin 3 or 4. J2-J4 wire pins 1 and 2, the
#   contacts a 2-pin side A plug lands on.
SOCKET_NODES = {
    "J1": {1: 4, 2: 18, 3: 24, 4: 16},
    "J2": {1: 25, 2: 20},
    "J3": {1: 2, 2: 12},
    "J4": {1: 3, 2: 7},
}

