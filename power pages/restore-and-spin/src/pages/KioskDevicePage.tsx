import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DEVICE_PROFILES } from "../data/deviceProfiles";
import type { DeviceState } from "../types/game";
import { HelpFixBar } from "../components/HelpFixBar";
import { WinOverlay } from "../components/WinOverlay";
import { DemoGearMenu } from "../components/DemoGearMenu";
import { DialArcPanel } from "../components/layouts/DialArcPanel";
import { KeypadPanel } from "../components/layouts/KeypadPanel";
import { DipStripPanel } from "../components/layouts/DipStripPanel";
import { PairedColumnsPanel } from "../components/layouts/PairedColumnsPanel";
import { RadioClusterPanel } from "../components/layouts/RadioClusterPanel";

/**
 * One route, one component, 11 data-driven instances — GAME_MODE_PLAN.md §6. Keyed by
 * `deviceSlug` at the router level (see App.tsx) so React fully remounts this component on
 * every dial change, matching the "no stale state carries over" guarantee from §4 without
 * a hard page reload.
 */
export function KioskDevicePage() {
  const { deviceSlug = "" } = useParams();
  const navigate = useNavigate();
  const device = DEVICE_PROFILES[deviceSlug];

  const [state, setState] = useState<DeviceState>(() => ({ ...device?.fault }));
  const [telemetryTick, setTelemetryTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTelemetryTick((t) => (t + 0.4) % 6), 400);
    return () => clearInterval(id);
  }, []);

  if (!device) {
    return (
      <div style={{ padding: 24, color: "#c8d4c8" }}>
        Unknown device "{deviceSlug}". <button onClick={() => navigate("/kiosk/info")}>Go to info screen</button>
      </div>
    );
  }

  const win = device.checkWin(state);
  const lamps = device.computeLamps(state, win);

  function handleToggle(key: string) {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleReset() {
    setState({ ...device.fault });
  }

  return (
    <div className="kiosk-screen" data-skin={device.slug}>
      <div className={`motif motif-${device.slug}`} />
      {device.slug === "coldchain-sensor" && (
        <>
          <div className="chrome-crosshair tl" />
          <div className="chrome-crosshair br" />
        </>
      )}
      {device.slug === "water-pump" && <div className="chrome-hazard" />}
      {device.slug === "field-radio" && (
        <>
          <div className="chrome-rivet tl" />
          <div className="chrome-rivet tr" />
          <div className="chrome-rivet bl" />
          <div className="chrome-rivet br" />
        </>
      )}

      <div className="status-bar">
        <span>
          <span className="live-dot" />
          PANEL LINK: CONNECTED
        </span>
        <span>LAST UPDATE {telemetryTick.toFixed(1)}s AGO</span>
      </div>

      <div className="kiosk-header">
        <div>
          <span className="sector-tag">{device.sector}</span>
          <h2>{device.label}</h2>
        </div>
        <span className="position-badge">DIAL {device.dialPosition} / 12</span>
      </div>

      <div className="fault-line" data-mode={win ? "ok" : "fault"} dangerouslySetInnerHTML={{ __html: win ? device.okText : device.faultText }} />

      <div className="panel-body">
        {device.layout === "dial-arc" && (
          <DialArcPanel device={device} state={state} lampColors={lamps} onToggle={handleToggle} />
        )}
        {device.layout === "keypad" && (
          <KeypadPanel device={device} state={state} lampColors={lamps} win={win} onToggle={handleToggle} />
        )}
        {device.layout === "dip-strip" && (
          <DipStripPanel device={device} state={state} lampColors={lamps} win={win} onToggle={handleToggle} />
        )}
        {device.layout === "paired-columns" && (
          <PairedColumnsPanel device={device} state={state} lampColors={lamps} onToggle={handleToggle} />
        )}
        {device.layout === "radio-cluster" && (
          <RadioClusterPanel device={device} state={state} lampColors={lamps} onToggle={handleToggle} />
        )}
      </div>

      <HelpFixBar isAlert={!win} steps={device.steps} />

      <div className="telemetry-strip">
        <span>
          PANEL_LINK: <span className="live">CONNECTED</span>
        </span>
        <span>UNIT: game-panel-01</span>
      </div>

      {win && (
        <WinOverlay
          winMessage={device.winMessage}
          restoreItems={device.restoreItems}
          claimToken={`${device.slug}-${Date.now()}`}
          onReset={handleReset}
        />
      )}

      <DemoGearMenu currentSlug={device.slug} />
    </div>
  );
}
