import type { DeviceProfile, DeviceState } from "../types/game";
import type { PanelCable } from "../types/telemetry";

const stateWord = (on: boolean, isSocket: boolean) => (isSocket ? (on ? "CONNECTED" : "OPEN") : on ? "ON" : "OFF");

function describeCables(cables: PanelCable[] | undefined): string {
  if (!cables || cables.length === 0) return "No cables detected.";
  return cables
    .map((c) => `${c.cable === null ? "an unrecognised cable" : `Cable ${c.cable}`} between ${c.sockets.join(" and ")}`)
    .join("; ");
}

/**
 * The one structured prompt the Help Fix bar sends over Direct Line (GAME_MODE_PLAN.md §1/§8):
 * the device's restore order with each control's current and target state, the cables
 * currently plugged in, and the reply format. The agent replies with only a numbered list.
 */
export function buildQuickFixPrompt(
  device: DeviceProfile,
  state: DeviceState,
  cables: PanelCable[] | undefined
): string {
  const controls = device.restoreSequence
    .map((step, index) => {
      const isSocket = step.physicalPin.startsWith("J");
      const current = Boolean(state[step.key]);
      const verdict = current === step.target ? "OK" : "WRONG";
      return (
        `${index + 1}. ${step.physicalPin} ${step.label}: currently ${stateWord(current, isSocket)}, ` +
        `needs ${stateWord(step.target, isSocket)} (${verdict})`
      );
    })
    .join("\n");

  return (
    `Panel quick-fix request.\n` +
    `CURRENT_MODE: ${device.label} (${device.slug}), mode ${device.modeIndex}.\n` +
    `TARGET: every control below must match its "needs" state. Controls are restored in the listed order.\n` +
    `CURRENT_STATE:\n` +
    `${controls}\n` +
    `CABLES: ${describeCables(cables)} A socket reads CONNECTED only while both ends of a cable are plugged in, ` +
    `so sockets connect and disconnect in pairs.\n` +
    `What must the player change, in order, to restore this device? ` +
    `Reply with ONLY a plain numbered list of actions for the controls marked WRONG. ` +
    `No emojis, no citations, no markdown, no preamble, no explanation.`
  );
}
