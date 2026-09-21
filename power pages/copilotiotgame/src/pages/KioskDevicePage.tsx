import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DEVICE_PROFILES } from "../data/deviceProfiles";
import type { DeviceState } from "../types/game";
import { PanelSurface } from "../components/surfaces/PanelSurface";
import { HelpFixBar } from "../components/HelpFixBar";
import { usePanelTelemetry } from "../hooks/usePanelTelemetry";
import { buildQuickFixPrompt } from "../lib/quickFixPrompt";
import { WinOverlay } from "../components/WinOverlay";
import { SuccessPopup } from "../components/SuccessPopup";
import { DemoGearMenu } from "../components/DemoGearMenu";
import { useSignalR } from "../context/SignalRContext";
import { API_BASE_URL } from "../lib/apiConfig";

/**
 * One route, one component, 12 data-driven playable modes — GAME_MODE_PLAN.md §6. Keyed by
 * `deviceSlug` at the router level (see App.tsx) so React fully remounts this component on
 * every mode change, matching the "no stale state carries over" guarantee from §4 without
 * a hard page reload.
 */
export function KioskDevicePage() {
  const { deviceSlug = "" } = useParams();
  const navigate = useNavigate();
  const { connection } = useSignalR();
  const device = DEVICE_PROFILES[deviceSlug];

  const [state, setState] = useState<DeviceState>({});
  const { reading, isLive, ageSeconds } = usePanelTelemetry(deviceSlug);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  // Guards create-win re-entry synchronously -- `claimToken` state alone isn't enough
  // because it only updates once the fetch resolves. If gameModeEnabled flips (now live
  // via SignalR, see below) more than once while a create-win call is still in flight,
  // checking claimToken would let a second call start before the first has set it,
  // producing a fresh claimToken/QR each time and making the win screen flicker.
  const createWinRequestedRef = useRef(false);
  // Null while unknown (still loading) -- default to the ON behavior (today's flow) so a
  // slow/failed fetch never silently drops a real win into the OFF path.
  const [gameModeEnabled, setGameModeEnabled] = useState<boolean | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Live panel: mirror the Pi's controls (same keys as `state`). The physical panel is
  // the only source of truth for state changes; the on-screen controls are read-only.
  useEffect(() => {
    if (reading?.controls) setState((prev) => ({ ...prev, ...reading.controls }));
  }, [reading]);

  // Read the Game Mode flag once per device mount, then stay live via the
  // gameModeChanged SignalR broadcast (set-game-mode's counterpart to set-mode's
  // deviceChanged) -- without this listener, toggling Game Mode while the kiosk sits on
  // the same device had no visible effect until the device happened to rotate and
  // remount the page, since the initial fetch was never re-run otherwise.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/kiosk-state`)
      .then((res) => res.json())
      .then((data: { gameModeEnabled?: boolean }) => {
        if (!cancelled) setGameModeEnabled(data.gameModeEnabled ?? true);
      })
      .catch((err) => {
        console.error("Failed to read game mode state", err);
        if (!cancelled) setGameModeEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!connection) return;
    const handler = (payload: { gameModeEnabled: boolean }) => {
      setGameModeEnabled(payload.gameModeEnabled);
    };
    connection.on("gameModeChanged", handler);
    return () => {
      connection.off("gameModeChanged", handler);
    };
  }, [connection]);

  const win = device ? device.checkWin(state) : false;

  // Game Mode ON: creates the andy_gamewin row (PRIZE_ENGINE_SPEC.md §3 step 1 --
  // standing in for the not-yet-built Copilot Studio topic action) exactly once per
  // win, on the false->true transition. claimToken resets to null in
  // handleCompletionReset so a re-fix fires this again.
  //
  // Game Mode OFF: skips this entirely -- no andy_gamewin row, no Dataverse write at
  // all, per the decision to leave OFF completions unlogged. Shows the success popup
  // client-side only instead.
  useEffect(() => {
    if (!win || !device || gameModeEnabled === null) return;
    if (!gameModeEnabled) {
      setShowSuccessPopup(true);
      return;
    }
    if (createWinRequestedRef.current) return;
    createWinRequestedRef.current = true;
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/create-win`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceSlug: device.slug }),
    })
      .then((res) => res.json())
      .then((data: { claimToken: string }) => {
        if (!cancelled) setClaimToken(data.claimToken);
      })
      .catch((err) => {
        console.error("Failed to create game win", err);
        if (!cancelled) createWinRequestedRef.current = false;
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win, gameModeEnabled]);

  if (!device) {
    return (
      <div style={{ padding: 24, color: "#c8d4c8" }}>
        Unknown device "{deviceSlug}". <button onClick={() => navigate("/kiosk/info")}>Go to info screen</button>
      </div>
    );
  }

  const lamps = device.computeLamps(state, win);

  // Fires when the win/success overlay's own dwell timer elapses, in both Game Mode
  // states. Clears local win state (belt-and-suspenders in case the auto-rotate below
  // happens to re-pick this same device -- SignalR's deviceChanged dedupe would then
  // skip re-navigating, so this component would otherwise stay stuck showing the win
  // screen) and immediately auto-picks a new random *enabled* mode server-side; the
  // resulting deviceChanged broadcast is what actually moves the kiosk on, via the
  // existing useDeviceSync listener at the app root -- no local navigation call needed.
  function handleCompletionReset() {
    setState({ ...device.fault });
    setClaimToken(null);
    createWinRequestedRef.current = false;
    setShowSuccessPopup(false);
    fetch(`${API_BASE_URL}/api/pick-random-mode`, { method: "POST" }).catch((err) =>
      console.error("Failed to pick a random mode", err)
    );
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

      <div className="kiosk-header">
        <div>
          <span className="sector-tag">{device.sector}</span>
          <h2>{device.label}</h2>
        </div>
        <span className="position-badge">MODE {device.modeIndex} / 12</span>
      </div>

      <div className="fault-line" data-mode={win ? "ok" : "fault"} dangerouslySetInnerHTML={{ __html: !isLive ? "<strong>Panel readings unavailable.</strong> Waiting for a live connection." : win ? device.okText : device.faultText }} />

      <div className="panel-body">
        <PanelSurface device={device} state={state} lampColors={lamps} win={win}
          controls={device.restoreSequence} connection={{ isLive, ageSeconds }} />
      </div>

      {!win && (
        <HelpFixBar
          isAlert
          steps={device.steps}
          getPrompt={() => buildQuickFixPrompt(device, state, reading?.cables)}
        />
      )}

      {win && gameModeEnabled && claimToken && (
        <WinOverlay
          winMessage={device.winMessage}
          restoreItems={device.restoreItems}
          claimToken={claimToken}
          onReset={handleCompletionReset}
        />
      )}

      {win && gameModeEnabled === false && showSuccessPopup && (
        <SuccessPopup
          winMessage={device.winMessage}
          restoreItems={device.restoreItems}
          onReset={handleCompletionReset}
        />
      )}

      <DemoGearMenu currentSlug={device.slug} azureConnected={!!connection} iotConnected={isLive} iotAgeSeconds={ageSeconds ?? undefined} />
    </div>
  );
}
