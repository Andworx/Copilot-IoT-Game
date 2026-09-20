import { DEVICE_ORDER, DEVICE_PROFILES } from "../data/deviceProfiles";
import { DemoGearMenu } from "../components/DemoGearMenu";
import { useSignalR } from "../context/SignalRContext";

/**
 * Demo/info screen, not a game device (andy_isgamedevice = No).
 * GAME_MODE_PLAN.md §0/§11.
 */
export function KioskInfoPage() {
  const { connection } = useSignalR();

  return (
    <div className="kiosk-screen">
      <div className="kiosk-header">
        <div>
          <span className="sector-tag">HOW TO PLAY</span>
          <h2>Restore &amp; Spin</h2>
        </div>
      </div>

      <div className="panel-body" style={{ alignItems: "flex-start", gap: 14 }}>
        <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6, color: "var(--color-text)" }}>
          Pick a device mode in the Power App to troubleshoot. Use the physical panel to flip
          switches, connect socket cables, watch the status lamps, and use Help Fix if you get stuck. Restore
          the device to working order to win a prize.
        </p>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: "0.8rem", lineHeight: 1.8, color: "var(--color-text-bright)" }}>
          {DEVICE_ORDER.map((slug) => (
            <li key={slug}>
              Mode {DEVICE_PROFILES[slug].modeIndex}: {DEVICE_PROFILES[slug].label} ({DEVICE_PROFILES[slug].sector})
            </li>
          ))}
        </ol>
      </div>

      <DemoGearMenu currentSlug="info" azureConnected={!!connection} />
    </div>
  );
}
