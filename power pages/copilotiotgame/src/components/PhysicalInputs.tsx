import type { DeviceState, RestoreStep } from "../types/game";

export function PhysicalInputs({ controls, state, isLive }: {
  controls: readonly RestoreStep[];
  state: DeviceState;
  isLive: boolean;
}) {
  const ordered = [...controls].sort((a, b) => {
    const order = ["SW1", "SW2", "SW3", "SW4", "SW5", "SW6", "J1", "J2", "J3", "J4"];
    return order.indexOf(a.physicalPin) - order.indexOf(b.physicalPin);
  });
  return (
    <section className="physical-inputs" aria-label="Physical panel inputs">
      <div className="physical-inputs-heading">PHYSICAL PANEL <span>Read-only · use the switches and sockets on the box</span></div>
      <div className="physical-input-grid">
        {ordered.map((control) => {
          const known = isLive && typeof state[control.key] === "boolean";
          const value = state[control.key];
          const socket = control.physicalPin.startsWith("J");
          const label = control.label.replace(/^.*? - /, "").replace(/^Socket J\d connected$/, "Cable socket");
          return (
            <div className="physical-input" key={control.key} data-pin={control.physicalPin}>
              <strong>{control.physicalPin}</strong><span className="physical-input-name">{label}</span>
              <span className="physical-input-value" data-on={known && value}>
                {known ? (socket ? (value ? "Connected" : "Open") : (value ? "ON" : "OFF")) : "Unknown"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
