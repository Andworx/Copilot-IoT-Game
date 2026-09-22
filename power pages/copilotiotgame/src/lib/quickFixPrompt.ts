import type { DeviceProfile, DeviceState } from "../types/game";
import type { PanelCable } from "../types/telemetry";
import { restoreActionsFrom } from "../data/deviceProfiles";

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
  const actions = restoreActionsFrom(device.restoreSequence, state)
    .map((action, index) => `${index + 1}. ${action}`)
    .join("\n");
  const controls = device.restoreSequence
    .map((step, index) => {
      const isSocket = step.physicalPin.startsWith("J");
      const current = Boolean(state[step.key]);
      const verdict = current === step.target ? "OK" : "WRONG";
      return (
        `${index + 1}. ${step.physicalPin} ${step.label}: currently ${stateWord(current, isSocket)}, ` +
        `${verdict}`
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
    `so sockets connect and disconnect in pairs. Cable identity matters; unknown, missing or extra cables prevent restoration.\n` +
    `ACTIONS_TO_RETURN:\n${actions}\n` +
    `What must the player change, in order, to restore this device? ` +
    `Reply with ONLY the numbered ACTIONS_TO_RETURN list. ` +
    `Each action must start with Turn, Connect, Disconnect, or Remove. ` +
    `No emojis, no citations, no markdown, no preamble, no explanation.`
  );
}
