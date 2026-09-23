import { cableActions } from "../data/deviceProfiles";
import { useEffect, useRef } from "react";
import type { DeviceProfile } from "../types/game";

/** Required final configuration, independent of telemetry availability. */
export function ControlSetupDialog({ device, onClose }: { device: DeviceProfile; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  function close() { ref.current?.close(); onClose(); }
  const switches = device.restoreSequence.filter(c => c.physicalPin.startsWith("SW")).sort((a, b) => a.physicalPin.localeCompare(b.physicalPin));
  const sockets = device.restoreSequence.filter(c => /^S[1-4]$/.test(c.physicalPin)).sort((a, b) => a.physicalPin.localeCompare(b.physicalPin));
  return <dialog ref={ref} className="control-setup" aria-labelledby="control-setup-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header><h2 id="control-setup-title">{device.label}: panel setup</h2><button type="button" autoFocus onClick={close} aria-label="Close panel setup">Close</button></header>
    <p>Set these positions on the physical box. Any order is fine.</p>
    <div className="control-setup-columns">
      <section aria-label="Required switch positions"><h3>Switch positions</h3><table><thead><tr><th>Switch</th><th>Function</th><th>Set to</th></tr></thead><tbody>
        {switches.map(c => <tr key={c.key} data-pin={c.physicalPin}><th>{c.physicalPin}</th><td>{c.label.replace(/^.*? - /, "")}</td><td><strong>{c.target ? "ON" : "OFF"}</strong></td></tr>)}
      </tbody></table></section>
      <section aria-label="Required cable connections"><h3>Cables</h3><ul>{cableActions(device.requiredCables).map(action => <li key={action}>{action}</li>)}</ul>
        <ul>{sockets.map(c => <li key={c.key} data-pin={c.physicalPin}><strong>{c.physicalPin}</strong>: {c.target ? "Connected" : "Leave open"}</li>)}</ul>
        <p>Match both cable numbers and sockets. Quad ends fit S1/S4; dual ends fit S2/S3. Unknown or extra cables prevent restoration.</p>
      </section>
    </div>
  </dialog>;
}
