import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DEVICE_PROFILES, restoreActionsFrom } from "../data/deviceProfiles";
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

interface RuntimeDeviceProfile {
  deviceSlug: string;
  winText: string | null;
}

/**
 * One route, one component, 12 data-driven playable modes — GAME_MODE_PLAN.md §6. Keyed by
 * `deviceSlug` at the router level (see App.tsx) so React fully remounts this component on
 * every mode change, matching the "no stale state carries over" guarantee from §4 without
 * a hard page reload.
 */
export function KioskDevicePage() {
  const { deviceSlug = "" } = useParams();
  const navigate = useNavigate();
  const { connection, isConnected, connectionRevision } = useSignalR();
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
  const gameModeVersionRef = useRef(0);
  const [gameModeEnabled, setGameModeEnabled] = useState<boolean | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [runtimeProfile, setRuntimeProfile] = useState<RuntimeDeviceProfile | null>(null);

  // Live panel: mirror the Pi's controls (same keys as `state`). The physical panel is
  // the only source of truth for state changes; the on-screen controls are read-only.
  useEffect(() => {
    if (reading?.controls) setState((prev) => ({ ...prev, ...reading.controls }));
  }, [reading]);

  // Refresh after recovery too: gameModeChanged may have been missed while asleep.
  // A newer broadcast takes precedence over an in-flight snapshot.
  useEffect(() => {
    let cancelled = false;
    const version = gameModeVersionRef.current;
    fetch(`${API_BASE_URL}/api/kiosk-state`)
      .then((res) => {
        if (!res.ok) throw new Error("Game Mode state unavailable");
        return res.json();
      })
      .then((data: { gameModeEnabled?: boolean }) => {
        if (!cancelled && version === gameModeVersionRef.current) setGameModeEnabled(data.gameModeEnabled ?? true);
      })
      .catch((err) => {
        console.error("Failed to read game mode state", err);
        if (!cancelled && version === gameModeVersionRef.current) setGameModeEnabled(current => current ?? true);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionRevision]);

  useEffect(() => {
    if (!connection) return;
    const handler = (payload: { gameModeEnabled: boolean }) => {
      gameModeVersionRef.current++;
      setGameModeEnabled(payload.gameModeEnabled);
    };
    connection.on("gameModeChanged", handler);
    return () => {
      connection.off("gameModeChanged", handler);
    };
  }, [connection]);

  useEffect(() => {
    if (!deviceSlug) return;
    let cancelled = false;
    setRuntimeProfile(null);
    fetch(`${API_BASE_URL}/api/device-profiles`)
      .then((res) => {
        if (!res.ok) throw new Error("Device profiles unavailable");
        return res.json();
      })
      .then((data: { profiles?: RuntimeDeviceProfile[] }) => {
        if (cancelled) return;
        setRuntimeProfile(data.profiles?.find((profile) => profile.deviceSlug === deviceSlug) ?? null);
      })
      .catch((err) => {
        console.error("Failed to read device profile copy", err);
        if (!cancelled) setRuntimeProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [deviceSlug]);

  const win = Boolean(device && isLive && reading?.cableSchema === "panel-rj45-links/v1" && reading.win === true &&
    reading.controls && device.checkWin(reading.controls, reading.cables));

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

  const completionMessage = runtimeProfile?.winText || device.winMessage;

  // Fires when the win/success overlay's own dwell timer elapses, in both Game Mode
  // states. Clears local overlay state, but keeps the kiosk on this same mode so the
  // completed scenario remains visible instead of rotating to the next enabled item.
  function handleCompletionReset() {
    setState({ ...device.fault });
    setClaimToken(null);
    createWinRequestedRef.current = false;
    setShowSuccessPopup(false);
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

      <div className="fault-line" data-mode={!isLive ? "unavailable" : win ? "ok" : "fault"} dangerouslySetInnerHTML={{ __html: !isLive ? "<strong>Panel readings unavailable.</strong> Waiting for a live connection." : win ? device.okText : device.faultText }} />

      <div className="panel-body">
        <PanelSurface device={device} state={state} lampColors={lamps} win={win}
          controls={device.restoreSequence} connection={{ isLive, ageSeconds }} />
      </div>

      {!win && (
        <HelpFixBar
          isAlert
          steps={restoreActionsFrom(device.restoreSequence, state).map((action, index) => `${index + 1}. ${action}`)}
          getPrompt={() => buildQuickFixPrompt(device, state, reading?.cables)}
        />
      )}

      {win && gameModeEnabled && claimToken && (
        <WinOverlay
          droneTakeoff={device.slug === "drone-ground-control"}
          winMessage={completionMessage}
          restoreItems={device.slug === "drone-ground-control" ? ["GPS enabled", "Telemetry enabled", "Uplink enabled", "Communications ready"] : device.restoreItems}
          claimToken={claimToken}
          onReset={handleCompletionReset}
        />
      )}

      {win && gameModeEnabled === false && showSuccessPopup && (
        <SuccessPopup
          droneTakeoff={device.slug === "drone-ground-control"}
          winMessage={completionMessage}
          restoreItems={device.slug === "drone-ground-control" ? ["GPS enabled", "Telemetry enabled", "Uplink enabled", "Communications ready"] : device.restoreItems}
          onReset={handleCompletionReset}
        />
      )}

      <DemoGearMenu currentSlug={device.slug} azureConnected={isConnected} iotConnected={isLive} iotAgeSeconds={ageSeconds ?? undefined} />
    </div>
  );
}
