import type { DeviceState, RestoreStep } from "../types/game";
import type { PanelCable } from "../types/telemetry";

export interface PanelSnapshot {
  controls: readonly RestoreStep[];
  state: DeviceState;
  cables: readonly PanelCable[] | undefined;
}

const pairKey = (a: string, b: string) => [a, b].sort().join("|");

/** Strips the list numbering the agent puts in front of each action. */
export function parseAgentActions(response: string): string[] {
  return response
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean);
}

/** The LAN socket pair a line talks about ("LAN 1 and LAN 3" -> "S1|S3"), if any. */
function socketPair(line: string): string | null {
  const sockets = [...line.matchAll(/\bLAN\s*([1-4])\b/gi)].map((m) => `S${m[1]}`);
  return sockets.length === 2 && sockets[0] !== sockets[1] ? pairKey(sockets[0], sockets[1]) : null;
}

function switchPin(line: string): string | null {
  const keyed = /keyed\s+switch\s*([12])\b/i.exec(line);
  if (keyed) return `SW${Number(keyed[1]) + 4}`;
  const plain = /\bswitch\s*([1-6])\b/i.exec(line);
  return plain ? `SW${plain[1]}` : null;
}

/**
 * Whether one line of the agent's reply is already satisfied by the live panel. This reads only
 * the agent's wording plus current readings, so the kiosk never carries its own copy of the
 * steps. A line it cannot interpret is never reported as done.
 *
 * "Remove all other cables" is judged against the cables the agent itself said to connect.
 */
export function isAgentActionDone(line: string, allLines: readonly string[], panel: PanelSnapshot): boolean {
  const cables = panel.cables ?? [];
  const livePairs = new Set(
    cables.filter((cable) => cable.sockets.length === 2).map((cable) => pairKey(cable.sockets[0], cable.sockets[1]))
  );

  const pin = switchPin(line);
  if (pin) {
    const wantsOn = /\bon\b/i.test(line);
    const wantsOff = /\boff\b/i.test(line);
    const control = panel.controls.find((step) => step.physicalPin === pin);
    if (!control || wantsOn === wantsOff) return false;
    return Boolean(panel.state[control.key]) === wantsOn;
  }

  if (/\bother\b|\bextra\b|\ball\b/i.test(line) && /\bcables?\b/i.test(line) && /remove|disconnect|unplug/i.test(line)) {
    const wanted = new Set(
      allLines.filter((l) => /\bconnect\b/i.test(l) && !/\bdisconnect\b/i.test(l)).map(socketPair).filter(Boolean)
    );
    const hasUnrecognised = cables.some((cable) => cable.sockets.length !== 2);
    return !hasUnrecognised && [...livePairs].every((pair) => wanted.has(pair));
  }

  const pair = socketPair(line);
  if (pair) {
    if (/\b(?:disconnect|remove|unplug)\b/i.test(line)) return !livePairs.has(pair);
    if (/\bconnect\b/i.test(line)) return livePairs.has(pair);
  }

  return false;
}
