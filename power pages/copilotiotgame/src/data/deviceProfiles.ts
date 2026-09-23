import type { DeviceProfile, DeviceState, RestoreStep, CableRequirement } from "../types/game";
import { evaluateLamps, lampDefs, type LampRule } from "../lib/lampLogic";

/**
 * Ported from the validated HTML/JS prototype (see KIOSK_UI_SPEC.md and the "Restore &
 * Spin" artifact). checkWin/computeLamps are pure functions of switch state — they stay
 * here in code rather than in `andy_deviceprofile`, per the note in game.ts.
 */
export const DEVICE_ORDER = [
  "thermostat",
  "smart-lock",
  "coldchain-sensor",
  "water-pump",
  "field-radio",
  "ev-charger",
  "elevator",
  "traffic-signal",
  "patient-monitor",
  "retail-kiosk",
  "drone-ground-control",
  "industrial-robot-arm",
] as const;

export const CABLE_RECIPES: Record<string, readonly CableRequirement[]> = {
  "thermostat": [
    {
      "cable": 1,
      "sockets": [
        "J1",
        "J2"
      ]
    }
  ],
  "coldchain-sensor": [
    {
      "cable": 1,
      "sockets": [
        "J1",
        "J3"
      ]
    }
  ],
  "elevator": [
    {
      "cable": 4,
      "sockets": [
        "J1",
        "J2"
      ]
    }
  ],
  "patient-monitor": [
    {
      "cable": 4,
      "sockets": [
        "J1",
        "J3"
      ]
    }
  ],
  "drone-ground-control": [
    {
      "cable": 3,
      "sockets": [
        "J1",
        "J4"
      ]
    }
  ],
  "ev-charger": [
    {
      "cable": 1,
      "sockets": [
        "J1",
        "J2"
      ]
    },
    {
      "cable": 2,
      "sockets": [
        "J4",
        "J3"
      ]
    }
  ],
  "field-radio": [
    {
      "cable": 2,
      "sockets": [
        "J4",
        "J2"
      ]
    }
  ],
  "industrial-robot-arm": [
    {
      "cable": 2,
      "sockets": [
        "J4",
        "J3"
      ]
    }
  ],
  "retail-kiosk": [
    {
      "cable": 2,
      "sockets": [
        "J1",
        "J2"
      ]
    }
  ],
  "smart-lock": [
    {
      "cable": 2,
      "sockets": [
        "J1",
        "J3"
      ]
    }
  ],
  "traffic-signal": [
    {
      "cable": 1,
      "sockets": [
        "J1",
        "J3"
      ]
    },
    {
      "cable": 2,
      "sockets": [
        "J4",
        "J2"
      ]
    }
  ],
  "water-pump": [
    {
      "cable": 4,
      "sockets": [
        "J1",
        "J2"
      ]
    },
    {
      "cable": 2,
      "sockets": [
        "J4",
        "J3"
      ]
    }
  ]
};

const RESTORE_SEQUENCES = {
  "thermostat": [
    {"physicalPin": "SW3", "key": "fan", "label": "Toggle switch 1 - fan running", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": false},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1", "target": true},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": true},
    {"physicalPin": "SW2", "key": "eco", "label": "Safety switch 2 - eco lockout", "target": false},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2", "target": false},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": false},
    {"physicalPin": "SW4", "key": "mode", "label": "Toggle switch 2 - heat/cool select", "target": false},
  ],
  "coldchain-sensor": [
    {"physicalPin": "SW4", "key": "cloudsync", "label": "Toggle switch 2 - cloud sync", "target": true},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": true},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2", "target": false},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW2", "key": "calibration", "label": "Safety switch 2 - calibration", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": false},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1", "target": false},
    {"physicalPin": "SW3", "key": "threshold", "label": "Toggle switch 1 - threshold", "target": false},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": false},
  ],
  "elevator": [
    {"physicalPin": "SW2", "key": "brake", "label": "Safety switch 2 - brake release", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": false},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2 - inspection key", "target": true},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": true},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "SW3", "key": "doors", "label": "Toggle switch 1 - doors closed", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1", "target": false},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": false},
    {"physicalPin": "SW4", "key": "inspection", "label": "Toggle switch 2 - inspection mode", "target": false},
  ],
  "patient-monitor": [
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1 - nurse key", "target": true},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": true},
    {"physicalPin": "SW2", "key": "leads", "label": "Safety switch 2 - leads connected", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW4", "key": "alarm", "label": "Toggle switch 2 - alarm audible", "target": true},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": false},
    {"physicalPin": "SW3", "key": "spo2", "label": "Toggle switch 1 - SpO2 sensor", "target": true},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2", "target": false},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": false},
  ],
  "drone-ground-control": [
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": false},
    {"physicalPin": "SW4", "key": "uplink", "label": "Toggle switch 2 - uplink", "target": true},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2 - flight key", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW2", "key": "gps", "label": "Safety switch 2 - GPS lock", "target": true},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": false},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1", "target": false},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": true},
    {"physicalPin": "SW3", "key": "telemetry", "label": "Toggle switch 1 - telemetry", "target": true},
  ],
  "ev-charger": [
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": true},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1 - service lock", "target": true},
    {"physicalPin": "SW4", "key": "billing", "label": "Toggle switch 2 - billing link", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW2", "key": "contactor", "label": "Safety switch 2 - contactor", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": true},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2", "target": false},
    {"physicalPin": "SW3", "key": "ground", "label": "Toggle switch 1 - ground check", "target": true},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": true},
  ],
  "field-radio": [
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2 - crypto key", "target": true},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": true},
    {"physicalPin": "SW3", "key": "channelhop", "label": "Toggle switch 1 - channel hop", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": false},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": true},
    {"physicalPin": "SW2", "key": "encryption", "label": "Safety switch 2 - encryption", "target": true},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1", "target": false},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": false},
    {"physicalPin": "SW4", "key": "transmit", "label": "Toggle switch 2 - transmit", "target": true},
  ],
  "industrial-robot-arm": [
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": true},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - main power", "target": true},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2 - teach pendant key", "target": true},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": false},
    {"physicalPin": "SW3", "key": "servo", "label": "Toggle switch 1 - servo enable", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": false},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1 - cell access", "target": true},
    {"physicalPin": "SW2", "key": "estop", "label": "Safety switch 2 - E-stop reset", "target": true},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": true},
    {"physicalPin": "SW4", "key": "guard", "label": "Toggle switch 2 - guard door", "target": false},
  ],
  "retail-kiosk": [
    {"physicalPin": "SW3", "key": "reader", "label": "Toggle switch 1 - card reader", "target": true},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2 - cash drawer key", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": false},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": true},
    {"physicalPin": "SW4", "key": "network", "label": "Toggle switch 2 - network", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW2", "key": "printer", "label": "Safety switch 2 - receipt printer", "target": true},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": false},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1", "target": false},
  ],
  "smart-lock": [
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": false},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1 - service key", "target": true},
    {"physicalPin": "SW2", "key": "deadbolt", "label": "Safety switch 2 - deadbolt", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": false},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "SW4", "key": "alarm", "label": "Toggle switch 2 - alarm arm", "target": true},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW3", "key": "autolock", "label": "Toggle switch 1 - auto-lock", "target": false},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2", "target": true},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": true},
  ],
  "traffic-signal": [
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW4", "key": "manual", "label": "Toggle switch 2 - manual override", "target": false},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": true},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1 - cabinet key", "target": true},
    {"physicalPin": "SW2", "key": "controller", "label": "Safety switch 2 - controller", "target": true},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": true},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2", "target": false},
    {"physicalPin": "SW3", "key": "timing", "label": "Toggle switch 1 - timing plan", "target": true},
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": true},
  ],
  "water-pump": [
    {"physicalPin": "J4", "key": "socket_j4", "label": "Socket J4 connected", "target": true},
    {"physicalPin": "SW2", "key": "pumpenable", "label": "Safety switch 2 - pump enable", "target": true},
    {"physicalPin": "SW5", "key": "keyed_one", "label": "Keyed switch 1", "target": false},
    {"physicalPin": "J1", "key": "socket_j1", "label": "Socket J1 connected", "target": true},
    {"physicalPin": "SW4", "key": "remote", "label": "Toggle switch 2 - remote override", "target": false},
    {"physicalPin": "J2", "key": "socket_j2", "label": "Socket J2 connected", "target": true},
    {"physicalPin": "SW1", "key": "power", "label": "Safety switch 1 - power", "target": true},
    {"physicalPin": "J3", "key": "socket_j3", "label": "Socket J3 connected", "target": true},
    {"physicalPin": "SW6", "key": "keyed_two", "label": "Keyed switch 2", "target": true},
    {"physicalPin": "SW3", "key": "relief", "label": "Toggle switch 1 - pressure relief", "target": true},
  ],
} as const;

type RestoreSequenceKey = keyof typeof RESTORE_SEQUENCES;

function controlName(control: RestoreStep) {
  if (control.physicalPin.startsWith("J")) return control.physicalPin;
  if (control.physicalPin === "SW5") return "Keyed switch 1";
  if (control.physicalPin === "SW6") return "Keyed switch 2";
  return `Switch ${control.physicalPin.replace("SW", "")}`;
}

function switchAction(control: RestoreStep) {
  return `Turn ${controlName(control)} ${control.target ? "on" : "off"}`;
}

function shouldListControl(control: RestoreStep, state?: DeviceState) {
  return !state || !(control.key in state) || Boolean(state[control.key]) !== control.target;
}

export function cablesMatch(required: readonly CableRequirement[], actual?: readonly CableRequirement[]): boolean {
  if (!actual || actual.length !== required.length) return false;
  const seen = new Set<string>();
  for (const cable of actual) {
    if (!Number.isInteger(cable.cable) || cable.sockets.length !== 2 || new Set(cable.sockets).size !== 2) return false;
    if (cable.sockets.some(socket => seen.has(socket))) return false;
    cable.sockets.forEach(socket => seen.add(socket));
    if (!required.some(want => want.cable === cable.cable && want.sockets.every(socket => cable.sockets.includes(socket)))) return false;
  }
  return true;
}

export function cableActions(required: readonly CableRequirement[]) {
  return [...required.map(cable => `Connect Cable ${cable.cable} to ${cable.sockets.join(" and ")}`), "Remove all other cables"];
}

function socketActionsFrom(sequence: readonly RestoreStep[], _state?: DeviceState) {
  const slug = Object.keys(RESTORE_SEQUENCES).find(key => RESTORE_SEQUENCES[key as RestoreSequenceKey] === sequence);
  return slug ? cableActions(CABLE_RECIPES[slug]) : [];
}

export function restoreActionsFrom(sequence: readonly RestoreStep[], state?: DeviceState) {
  const switches = sequence
    .filter((control) => /^SW[1-4]$/.test(control.physicalPin) && shouldListControl(control, state))
    .sort((a, b) => a.physicalPin.localeCompare(b.physicalPin))
    .map(switchAction);
  const keyedSwitches = sequence
    .filter((control) => /^SW[5-6]$/.test(control.physicalPin) && shouldListControl(control, state))
    .sort((a, b) => a.physicalPin.localeCompare(b.physicalPin))
    .map(switchAction);
  return [...switches, ...keyedSwitches, ...socketActionsFrom(sequence, state)];
}

function faultFrom(sequence: readonly { key: string; target: boolean }[]) {
  return Object.fromEntries(sequence.map((control) => [control.key, !control.target]));
}

function isRestored(sequence: readonly { key: string; target: boolean }[], state: Record<string, boolean>) {
  return sequence.every((control) => state[control.key] === control.target);
}

function stepsFrom(sequence: readonly RestoreStep[]) {
  return restoreActionsFrom(sequence).map((action, index) => `${index + 1}. ${action}`);
}

function restoreItemsFrom(sequence: readonly RestoreStep[]) {
  return restoreActionsFrom(sequence);
}

function sequence(slug: RestoreSequenceKey) {
  return RESTORE_SEQUENCES[slug];
}

// LED1/blue "power" and LED4/green "restored" are the same everywhere the panel is
// (see the "Per-mode LED behavior" table in hardware/raspberry-pi/README.md); "restored"
// itself always evaluates false here because evaluateLamps' win override already forces
// every lamp green the instant a mode is won, exactly like the Pi's `restored=win`.
const anySocket = (s: DeviceState) => !!s.socket_j1 || !!s.socket_j2 || !!s.socket_j3 || !!s.socket_j4;

const LAMPS: Record<string, LampRule[]> = {
  thermostat: [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "fan_running", label: "Fan running", when: (s) => !!s.fan, pattern: "blink" },
    { key: "climate_active", label: "Climate active", when: (s) => !s.eco && anySocket(s), pattern: "on" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "smart-lock": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "alarm_armed", label: "Alarm armed", when: (s) => !!s.alarm, pattern: "fast_blink" },
    { key: "deadbolt_engaged", label: "Deadbolt engaged", when: (s) => !!s.deadbolt && anySocket(s), pattern: "on" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "coldchain-sensor": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "threshold_alarm", label: "Threshold alarm", when: (s) => !!s.threshold, pattern: "fast_blink" },
    { key: "cloud_link", label: "Cloud sync", when: (s) => !!s.cloudsync && anySocket(s), pattern: "blink" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "water-pump": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "remote_override", label: "Remote override", when: (s) => !!s.remote, pattern: "blink" },
    { key: "pump_running", label: "Pump running", when: (s) => !!s.pumpenable && anySocket(s), pattern: "fast_blink" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "field-radio": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "transmitting", label: "Transmitting", when: (s) => !!s.transmit, pattern: "fast_blink" },
    { key: "secure_link", label: "Secure link", when: (s) => !!s.encryption && anySocket(s), pattern: "on" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "ev-charger": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "ground_fault", label: "Ground fault", when: (s) => !s.ground, pattern: "fast_blink" },
    { key: "charging", label: "Charging", when: (s) => !!s.contactor && anySocket(s), pattern: "blink" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  elevator: [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "inspection_mode", label: "Inspection mode", when: (s) => !!s.inspection, pattern: "blink" },
    { key: "car_ready", label: "Car ready", when: (s) => !!s.doors && anySocket(s), pattern: "on" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "traffic-signal": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "manual_override", label: "Manual override", when: (s) => !!s.manual, pattern: "fast_blink" },
    { key: "timing_cycle", label: "Signal cycling", when: (s) => !!s.timing && anySocket(s), pattern: "blink" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "patient-monitor": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "leads_search", label: "Leads search", when: (s) => !s.leads, pattern: "blink" },
    { key: "clinical_alarm", label: "Clinical alarm", when: (s) => !!s.alarm && !!s.spo2, pattern: "fast_blink" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "retail-kiosk": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "network_search", label: "Network search", when: (s) => !s.network, pattern: "blink" },
    { key: "ready_to_transact", label: "Ready to transact", when: (s) => !!s.reader && !!s.printer && anySocket(s), pattern: "on" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "drone-ground-control": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "gps_search", label: "GPS search", when: (s) => !s.gps, pattern: "blink" },
    { key: "uplink_ready", label: "Uplink ready", when: (s) => !!s.uplink && anySocket(s), pattern: "on" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
  "industrial-robot-arm": [
    { key: "power", label: "Power", when: (s) => !!s.power, pattern: "on" },
    { key: "guard_open", label: "Guard door open", when: (s) => !!s.guard, pattern: "fast_blink" },
    { key: "servo_active", label: "Servo active", when: (s) => !!s.servo && anySocket(s), pattern: "blink" },
    { key: "restored", label: "Restored", when: () => false, pattern: "on" },
  ],
};

export const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  thermostat: {
    slug: "thermostat",
    label: "Smart Thermostat",
    sector: "HOME",
    dialPosition: 1,
    modeIndex: 1,
    restoreSequence: sequence("thermostat"),
    isGameDevice: true,
    surfaceKind: "hvac-thermostat",
    accent: "#d98b4a",
    displayFont: "'Baloo 2', system-ui, sans-serif",
    lamps: lampDefs(LAMPS["thermostat"]),
    fault: faultFrom(sequence("thermostat")),
    checkWin: (s, cables) => isRestored(sequence("thermostat"), s) && cablesMatch(CABLE_RECIPES["thermostat"], cables),
    requiredCables: CABLE_RECIPES["thermostat"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["thermostat"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("thermostat")),
    winMessage: "Thermostat restored — holding your set temperature.",
    restoreItems: restoreItemsFrom(sequence("thermostat")),
  },

  "smart-lock": {
    slug: "smart-lock",
    label: "Smart Lock & Security Panel",
    sector: "HOME / SECURITY",
    dialPosition: 2,
    modeIndex: 2,
    restoreSequence: sequence("smart-lock"),
    isGameDevice: true,
    surfaceKind: "security-door-panel",
    accent: "#4c8dff",
    displayFont: "'IBM Plex Mono', monospace",
    lamps: lampDefs(LAMPS["smart-lock"]),
    fault: faultFrom(sequence("smart-lock")),
    checkWin: (s, cables) => isRestored(sequence("smart-lock"), s) && cablesMatch(CABLE_RECIPES["smart-lock"], cables),
    requiredCables: CABLE_RECIPES["smart-lock"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["smart-lock"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("smart-lock")),
    winMessage: "House is secured now.",
    restoreItems: restoreItemsFrom(sequence("smart-lock")),
  },

  "coldchain-sensor": {
    slug: "coldchain-sensor",
    label: "Cold-Chain Warehouse Sensor",
    sector: "ENTERPRISE / INDUSTRIAL",
    dialPosition: 3,
    modeIndex: 3,
    restoreSequence: sequence("coldchain-sensor"),
    isGameDevice: true,
    surfaceKind: "coldchain-logger",
    accent: "#2dd4c7",
    displayFont: "'Chakra Petch', sans-serif",
    lamps: lampDefs(LAMPS["coldchain-sensor"]),
    fault: faultFrom(sequence("coldchain-sensor")),
    checkWin: (s, cables) => isRestored(sequence("coldchain-sensor"), s) && cablesMatch(CABLE_RECIPES["coldchain-sensor"], cables),
    requiredCables: CABLE_RECIPES["coldchain-sensor"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["coldchain-sensor"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("coldchain-sensor")),
    winMessage: "Cold-chain logger controls restored.",
    restoreItems: restoreItemsFrom(sequence("coldchain-sensor")),
  },

  "water-pump": {
    slug: "water-pump",
    label: "Water Pump Station Controller",
    sector: "PUBLIC SECTOR / UTILITY",
    dialPosition: 4,
    modeIndex: 4,
    restoreSequence: sequence("water-pump"),
    isGameDevice: true,
    surfaceKind: "pump-scada",
    accent: "#f2c230",
    displayFont: "'Fjalla One', sans-serif",
    lamps: lampDefs(LAMPS["water-pump"]),
    fault: faultFrom(sequence("water-pump")),
    checkWin: (s, cables) => isRestored(sequence("water-pump"), s) && cablesMatch(CABLE_RECIPES["water-pump"], cables),
    requiredCables: CABLE_RECIPES["water-pump"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["water-pump"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("water-pump")),
    winMessage: "Pump station is back online and operating normally.",
    restoreItems: restoreItemsFrom(sequence("water-pump")),
  },

  "field-radio": {
    slug: "field-radio",
    label: "Tactical Field Radio",
    sector: "MILITARY / DEFENSE",
    dialPosition: 5,
    modeIndex: 5,
    restoreSequence: sequence("field-radio"),
    isGameDevice: true,
    surfaceKind: "field-radio",
    accent: "#8a9a4a",
    displayFont: "'Black Ops One', sans-serif",
    lamps: lampDefs(LAMPS["field-radio"]),
    fault: faultFrom(sequence("field-radio")),
    checkWin: (s, cables) => isRestored(sequence("field-radio"), s) && cablesMatch(CABLE_RECIPES["field-radio"], cables),
    requiredCables: CABLE_RECIPES["field-radio"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["field-radio"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("field-radio")),
    winMessage: "Secure link established with base.",
    restoreItems: restoreItemsFrom(sequence("field-radio")),
  },

  "ev-charger": {
    slug: "ev-charger",
    label: "Smart EV Charger",
    sector: "HOME",
    dialPosition: 6,
    modeIndex: 6,
    restoreSequence: sequence("ev-charger"),
    isGameDevice: true,
    surfaceKind: "ev-charge-pedestal",
    accent: "#4ade80",
    displayFont: "'Sora', sans-serif",
    lamps: lampDefs(LAMPS["ev-charger"]),
    fault: faultFrom(sequence("ev-charger")),
    checkWin: (s, cables) => isRestored(sequence("ev-charger"), s) && cablesMatch(CABLE_RECIPES["ev-charger"], cables),
    requiredCables: CABLE_RECIPES["ev-charger"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["ev-charger"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("ev-charger")),
    winMessage: "EV charger restored — charging controls ready.",
    restoreItems: restoreItemsFrom(sequence("ev-charger")),
  },

  elevator: {
    slug: "elevator",
    label: "Elevator Control Panel",
    sector: "ENTERPRISE / FACILITIES",
    dialPosition: 7,
    modeIndex: 7,
    restoreSequence: sequence("elevator"),
    isGameDevice: true,
    surfaceKind: "elevator-service",
    accent: "#8a9aa8",
    displayFont: "'Rajdhani', sans-serif",
    lamps: lampDefs(LAMPS["elevator"]),
    fault: faultFrom(sequence("elevator")),
    checkWin: (s, cables) => isRestored(sequence("elevator"), s) && cablesMatch(CABLE_RECIPES["elevator"], cables),
    requiredCables: CABLE_RECIPES["elevator"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["elevator"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("elevator")),
    winMessage: "Elevator back in service.",
    restoreItems: restoreItemsFrom(sequence("elevator")),
  },

  "traffic-signal": {
    slug: "traffic-signal",
    label: "Traffic Signal Controller",
    sector: "PUBLIC SECTOR / TRANSPORTATION",
    dialPosition: 8,
    modeIndex: 8,
    restoreSequence: sequence("traffic-signal"),
    isGameDevice: true,
    surfaceKind: "traffic-cabinet",
    accent: "#ff7a33",
    displayFont: "'Oswald', sans-serif",
    lamps: lampDefs(LAMPS["traffic-signal"]),
    fault: faultFrom(sequence("traffic-signal")),
    checkWin: (s, cables) => isRestored(sequence("traffic-signal"), s) && cablesMatch(CABLE_RECIPES["traffic-signal"], cables),
    requiredCables: CABLE_RECIPES["traffic-signal"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["traffic-signal"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("traffic-signal")),
    winMessage: "Traffic signal restored to normal cycle.",
    restoreItems: restoreItemsFrom(sequence("traffic-signal")),
  },

  "patient-monitor": {
    slug: "patient-monitor",
    label: "Hospital Patient Monitor",
    sector: "HEALTHCARE",
    dialPosition: 9,
    modeIndex: 9,
    restoreSequence: sequence("patient-monitor"),
    isGameDevice: true,
    surfaceKind: "patient-monitor",
    accent: "#5ec8f2",
    displayFont: "'Public Sans', sans-serif",
    lamps: lampDefs(LAMPS["patient-monitor"]),
    fault: faultFrom(sequence("patient-monitor")),
    checkWin: (s, cables) => isRestored(sequence("patient-monitor"), s) && cablesMatch(CABLE_RECIPES["patient-monitor"], cables),
    requiredCables: CABLE_RECIPES["patient-monitor"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["patient-monitor"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("patient-monitor")),
    winMessage: "Patient monitor restored — monitor controls ready.",
    restoreItems: restoreItemsFrom(sequence("patient-monitor")),
  },

  "retail-kiosk": {
    slug: "retail-kiosk",
    label: "Retail Payment Kiosk",
    sector: "COMMERCIAL / RETAIL",
    dialPosition: 10,
    modeIndex: 10,
    restoreSequence: sequence("retail-kiosk"),
    isGameDevice: true,
    surfaceKind: "payment-terminal",
    accent: "#ff6f91",
    displayFont: "'Manrope', sans-serif",
    lamps: lampDefs(LAMPS["retail-kiosk"]),
    fault: faultFrom(sequence("retail-kiosk")),
    checkWin: (s, cables) => isRestored(sequence("retail-kiosk"), s) && cablesMatch(CABLE_RECIPES["retail-kiosk"], cables),
    requiredCables: CABLE_RECIPES["retail-kiosk"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["retail-kiosk"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("retail-kiosk")),
    winMessage: "Payment kiosk back online and processing.",
    restoreItems: restoreItemsFrom(sequence("retail-kiosk")),
  },

  "drone-ground-control": {
    slug: "drone-ground-control",
    label: "Drone Ground Control",
    sector: "AEROSPACE / DEFENSE",
    dialPosition: 11,
    modeIndex: 11,
    restoreSequence: sequence("drone-ground-control"),
    isGameDevice: true,
    surfaceKind: "drone-ground-station",
    accent: "#7c6ff2",
    displayFont: "'Orbitron', sans-serif",
    lamps: lampDefs(LAMPS["drone-ground-control"]),
    fault: faultFrom(sequence("drone-ground-control")),
    checkWin: (s, cables) => isRestored(sequence("drone-ground-control"), s) && cablesMatch(CABLE_RECIPES["drone-ground-control"], cables),
    requiredCables: CABLE_RECIPES["drone-ground-control"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["drone-ground-control"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("drone-ground-control")),
    winMessage: "Drone link restored — ready for flight ops.",
    restoreItems: restoreItemsFrom(sequence("drone-ground-control")),
  },

  "industrial-robot-arm": {
    slug: "industrial-robot-arm",
    label: "Industrial Robot Arm",
    sector: "MANUFACTURING / OT",
    dialPosition: 12,
    modeIndex: 12,
    restoreSequence: sequence("industrial-robot-arm"),
    isGameDevice: true,
    surfaceKind: "robot-teach-pendant",
    accent: "#ff8a3d",
    displayFont: "'Chakra Petch', sans-serif",
    lamps: lampDefs(LAMPS["industrial-robot-arm"]),
    fault: faultFrom(sequence("industrial-robot-arm")),
    checkWin: (s, cables) => isRestored(sequence("industrial-robot-arm"), s) && cablesMatch(CABLE_RECIPES["industrial-robot-arm"], cables),
    requiredCables: CABLE_RECIPES["industrial-robot-arm"],
    computeLamps: (s, win) => evaluateLamps(LAMPS["industrial-robot-arm"], s, win),
    faultText: "<strong>Restoration incomplete.</strong> Open the gear menu for switch positions &amp; cables, or use Help Fix.",
    okText: "<strong>Restored.</strong> All six switches and four sockets match this mode.",
    steps: stepsFrom(sequence("industrial-robot-arm")),
    winMessage: "Robot cell restored — supervised automation is ready.",
    restoreItems: restoreItemsFrom(sequence("industrial-robot-arm")),
  },
};
