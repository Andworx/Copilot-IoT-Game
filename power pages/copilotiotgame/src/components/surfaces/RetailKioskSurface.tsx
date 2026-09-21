import type { PanelSurfaceProps } from "./types";
import "../../styles/retail-kiosk.css";

/** Boolean panel equipment states; never a real payment or transaction display. */
export function RetailKioskSurface({ state, connection, win }: PanelSurfaceProps) {
  const known = (key: string) => connection.isLive && typeof state[key] === "boolean";
  const power = !known("power") ? "unknown" : state.power ? "on" : "off";
  function equipment(key: string) {
    return power === "unknown" || !known(key) ? "unknown" : power === "off" ? "unpowered" : state[key] ? "ready" : "offline";
  }
  const reader = equipment("reader"), network = equipment("network"), printer = equipment("printer");
  const label = (value: ReturnType<typeof equipment>) => ({ unknown: "Unknown", unpowered: "Unpowered", ready: "Ready", offline: "Offline" })[value];
  const restored = connection.isLive && win;
  return <div className="retail-surface" data-power={power} data-reader={reader} data-network={network} data-printer={printer} data-restored={restored}>
    <section className="retail-terminal" aria-label="Payment terminal">
      <div className="retail-terminal-brand"><span>PAYMENT TERMINAL</span><span>SW1 / {power === "unknown" ? "UNKNOWN" : power.toUpperCase()}</span></div>
      <div className="retail-display"><span>RESTORE &amp; SPIN</span><strong>{power === "unknown" ? "NO SIGNAL" : power === "off" ? "POWER OFF" : restored ? "TEST COMPLETE" : "SERVICE CHECK"}</strong><small>{restored ? "Simulated equipment test" : "Use the physical box to restore service"}</small></div>
      <div className="retail-reader" aria-label={`Card reader: ${label(reader)}`}><svg viewBox="0 0 70 48" aria-hidden="true"><rect x="3" y="9" width="36" height="28" rx="4" /><path d="M4 18 H38 M48 18 Q55 24 48 30 M55 12 Q68 24 55 36" /></svg><div><span>SW3 / CARD READER</span><strong>{label(reader)}</strong></div><div className="retail-card-slot" /></div>
      <div className="retail-keys"><span>SW5 / Key 1 <b>{!known("keyed_one") ? "Unknown" : state.keyed_one ? "ON" : "OFF"}</b></span><span>SW6 / Cash drawer key <b>{!known("keyed_two") ? "Unknown" : state.keyed_two ? "ON" : "OFF"}</b></span></div>
    </section>
    <div className="retail-peripherals">
      <section className="retail-network" aria-label={`Network: ${label(network)}`}><svg viewBox="0 0 110 44" aria-hidden="true"><rect x="2" y="12" width="24" height="20" rx="3" /><path className="retail-link" d="M27 22 H80" /><path d="M81 32 H100 Q111 30 106 20 Q103 12 97 15 Q91 2 84 14 Q75 16 81 32Z" /></svg><div><span>SW4 / NETWORK</span><strong>{label(network)}</strong></div></section>
      <section className="retail-printer" aria-label={`Receipt printer: ${label(printer)}`}>
        <div className="retail-printer-heading"><span>SW2 / RECEIPT PRINTER</span><strong>{label(printer)}</strong></div>
        <div className="retail-paper-bay"><div className="retail-printer-slot" />
          {restored ? <div className="retail-receipt"><strong>SIMULATED TEST RECEIPT</strong><span>Reader / network / printer verified</span><b>NO PAYMENT TAKEN</b></div> : <div className="retail-printer-note">{printer === "unknown" ? "Awaiting live panel readings" : printer === "unpowered" ? "Printer has no power" : printer === "offline" ? "Printer offline" : "Printer ready for equipment test"}<small>{printer === "ready" ? "Complete the remaining controls to finish" : "No receipt issued"}</small></div>}
        </div>
      </section>
      <div className="retail-repair">{!connection.isLive ? "Live panel connection needed" : restored ? "All switch and cable requirements verified" : "Setup incomplete / check switches & cables"}</div>
    </div>
  </div>;
}
