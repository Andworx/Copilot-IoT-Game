import type { DeviceProfile, DeviceState } from "../types/game";
import type { PanelCable } from "../types/telemetry";

const isSocketPin = (pin: string) => /^S[1-4]$/.test(pin);
const socketLabel = (socket: string) => socket.replace(/^S([1-4])$/, "LAN $1");

/** The label printed on the panel, which is also the name the restore manual uses. */
function printedName(pin: string): string {
  if (isSocketPin(pin)) return socketLabel(pin);
  if (pin === "SW5") return "Keyed switch 1";
  if (pin === "SW6") return "Keyed switch 2";
  return `Switch ${pin.replace("SW", "")}`;
}

const stateWord = (on: boolean, isSocket: boolean) => (isSocket ? (on ? "CONNECTED" : "OPEN") : on ? "ON" : "OFF");

function describeCables(cables: PanelCable[] | undefined): string {
  if (!cables || cables.length === 0) return "none detected.";
  return cables
    .map((c) => `${c.cable === null ? "an unrecognised link" : "RJ-45 patch cable"} between ${c.sockets.map(socketLabel).join(" and ")}`)
    .join("; ");
}

/**
 * The one structured prompt the Help Fix bar sends over Direct Line: which device mode is
 * active, the current position of every switch and socket, and the cables plugged in.
 *
 * It deliberately does not say what the final configuration is or which controls are wrong.
 * The Copilot Studio agent reads the restore manual for the mode, compares it with this state
 * and works out the steps itself. The reply format is the only thing the prompt dictates.
 */
export function buildQuickFixPrompt(
  device: DeviceProfile,
  state: DeviceState,
  cables: PanelCable[] | undefined
): string {
  const controls = device.restoreSequence
    .slice()
    .sort((a, b) => Number(isSocketPin(a.physicalPin)) - Number(isSocketPin(b.physicalPin)) || a.physicalPin.localeCompare(b.physicalPin))
    .map((step) => {
      const isSocket = isSocketPin(step.physicalPin);
      return `${printedName(step.physicalPin)}: ${stateWord(Boolean(state[step.key]), isSocket)}`;
    })
    .join("\n");

  return (
    `CURRENT_MODE: ${device.label} (${device.slug}), mode ${device.modeIndex}.\n` +
    `CURRENT_STATE:\n` +
    `${controls}\n` +
    `CABLES: ${describeCables(cables)}\n` +
    `Using the restore manual for this mode, list what the player must change to restore this device. ` +
    `Reply with ONLY a numbered list. ` +
    `Each step must start with Turn, Connect, Disconnect, or Remove. ` +
    `No emojis, citations, markdown, preamble or explanation.`
  );
}
