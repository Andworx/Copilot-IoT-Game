import { useCallback, useEffect, useState } from "react";
import { StaffOperationUnavailableError, staffRequest } from "./apiConfig";
import GrandPrizeCheckIn from "./GrandPrizeCheckIn";
import GrandPrizeDrawing from "./GrandPrizeDrawing";
import PrizeManagement from "./PrizeManagement";
import SmokeTest from "./SmokeTest";
import "./App.css";

interface DeviceProfile {
  id: string;
  name: string;
  deviceSlug: string;
  isEnabled: boolean;
}

interface KioskState {
  deviceSlug: string | null;
  deviceName: string | null;
  gameModeEnabled: boolean;
}

const DEMO_INFO_KEY = "__demo-info__";

/** The Plinko Station (andy_plinkoprofile slug) this app controls. */
const PLINKO_STATION = "plinko-default";

interface PlinkoState {
  gameModeActive: boolean;
}

/**
 * Staff control device for the Copilot IoT Game kiosk (GAME_MODE_PLAN.md §4a).
 * Picking a tile here calls POST /api/set-mode, which writes
 * andy_gameboxstate and broadcasts the change to every open kiosk screen
 * over SignalR -- confirmed live 2026-09-08, see power pages/copilotiotgame.
 *
 * Also owns two mode controls added for the Prize Engine consolidation work:
 * - A per-tile enable/disable toggle (andy_deviceprofile.andy_isenabled) --
 *   disabled devices are hidden from manual selection here and skipped by the
 *   kiosk's auto-rotate (POST /api/pick-random-mode), but the row stays intact.
 * - A master "Game Mode" switch (andy_gameboxstate.andy_gamemodeenabled) --
 *   OFF tells the kiosk to skip the QR/phone-spin/claim flow entirely on a
 *   device completion and show a simple success popup instead (no
 *   andy_gamewin row created). ON restores today's flow exactly.
 */
type Screen = "controls" | "prizes" | "smoke" | "checkIn" | "drawing";

export default function App() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [gameModeEnabled, setGameModeEnabledState] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingKey, setSettingKey] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [gameModeBusy, setGameModeBusy] = useState(false);
  const [plinko, setPlinko] = useState<PlinkoState | null>(null);
  const [plinkoBusy, setPlinkoBusy] = useState(false);
  const [plinkoNote, setPlinkoNote] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<Screen>>(new Set(["controls"]));
  const [screen, setScreen] = useState<Screen>("controls");
  const [presentationMode, setPresentationMode] = useState(false);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profilesRes, stateRes] = await Promise.all([
        staffRequest("/api/device-profiles"),
        staffRequest("/api/kiosk-state"),
      ]);
      if (!profilesRes.ok || !stateRes.ok) throw new Error("Failed to load current state");
      const profilesBody = (await profilesRes.json()) as { profiles: DeviceProfile[] };
      const stateBody = (await stateRes.json()) as KioskState;
      setProfiles(profilesBody.profiles);
      setActiveSlug(stateBody.deviceSlug);
      setGameModeEnabledState(stateBody.gameModeEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load current state");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  async function setMode(deviceProfileId: string | null, deviceSlug: string | null, deviceName: string | null) {
    setSettingKey(deviceSlug ?? DEMO_INFO_KEY);
    setError(null);
    try {
      const res = await staffRequest("/api/set-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceProfileId, deviceSlug, deviceName }),
      });
      if (!res.ok) throw new Error(`set-mode failed: ${res.status}`);
      setActiveSlug(deviceSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set mode");
    } finally {
      setSettingKey(null);
    }
  }

  async function toggleDeviceEnabled(profile: DeviceProfile) {
    setTogglingId(profile.id);
    setError(null);
    const nextEnabled = !profile.isEnabled;
    try {
      const res = await staffRequest("/api/toggle-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceProfileId: profile.id, isEnabled: nextEnabled }),
      });
      if (!res.ok) throw new Error(`toggle-device failed: ${res.status}`);
      setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, isEnabled: nextEnabled } : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle device");
    } finally {
      setTogglingId(null);
    }
  }

  /** Reads (no gameModeActive) or sets the Plinko station's Game Mode. Never throws: the card shows the note. */
  const callPlinko = useCallback(async (gameModeActive?: boolean): Promise<PlinkoState | null> => {
    setPlinkoNote(null);
    try {
      const res = await staffRequest("/api/plinko-game-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameModeActive === undefined ? { station: PLINKO_STATION } : { station: PLINKO_STATION, gameModeActive }),
      });
      if (!res.ok) throw new Error(`plinko-game-mode failed: ${res.status}`);
      const body = (await res.json()) as { gameModeActive?: boolean } | null;
      if (typeof body?.gameModeActive !== "boolean") throw new Error("Unexpected Plinko response");
      return { gameModeActive: body.gameModeActive };
    } catch (err) {
      setPlinkoNote(err instanceof StaffOperationUnavailableError ? err.message : "Could not reach the Plinko station.");
      return null;
    }
  }, []);

  useEffect(() => {
    void callPlinko().then(setPlinko);
  }, [callPlinko]);

  async function togglePlinkoGameMode() {
    if (!plinko) return;
    setPlinkoBusy(true);
    const next = await callPlinko(!plinko.gameModeActive);
    if (next) setPlinko(next);
    setPlinkoBusy(false);
  }

  async function toggleGameMode() {
    setGameModeBusy(true);
    setError(null);
    const next = !gameModeEnabled;
    try {
      const res = await staffRequest("/api/set-game-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameModeEnabled: next }),
      });
      if (!res.ok) throw new Error(`set-game-mode failed: ${res.status}`);
      setGameModeEnabledState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set game mode");
    } finally {
      setGameModeBusy(false);
    }
  }

  function navigate(next: Screen) {
    setVisited((previous) => new Set(previous).add(next));
    setScreen(next);
    if (next !== "drawing") setPresentationMode(false);
  }

  const hideSidebar = screen === "drawing" && presentationMode;

  return (
    <div className={hideSidebar ? "app-shell presentation-mode" : "app-shell"}>
      <a className="skip-link" href="#workspace">Skip to workspace</a>
      <aside className="sidebar" hidden={hideSidebar}>
        <div className="brand"><span className="brand-mark" aria-hidden="true">G</span><div>Game Control</div></div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {([
            ["controls", "Games", "Select a game and its controls", "01"],
            ["smoke", "Testing", "Run the prize claim smoke test", "02"],
            ["prizes", "Prize control", "View inventory and add prizes", "03"],
            ["checkIn", "Check in", "Validate final drawing codes", "04"],
            ["drawing", "Grand prize", "Run the final drawing wheel", "05"],
          ] as const).map(([id, label, description, number]) => (
            <button key={id} className="nav-item" aria-current={screen === id ? "page" : undefined} onClick={() => navigate(id)}>
              <span className="nav-number" aria-hidden="true">{number}</span><span>{label}<small>{description}</small></span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">Staff workspace<span>Manage the experience, all in one place.</span></div>
      </aside>
      <main id="workspace" tabIndex={-1}>
        {screen === "drawing" && (
          <button
            type="button"
            className={presentationMode ? "presentation-toggle presentation-toggle-compact" : "presentation-toggle"}
            aria-label={presentationMode ? "Show menu" : "Hide menu"}
            title={presentationMode ? "Show menu" : "Hide menu"}
            onClick={() => setPresentationMode((current) => !current)}
          >
            {presentationMode ? "⚙" : "Hide menu"}
          </button>
        )}
        <header className="page-header">
          <p className="eyebrow">OPERATIONS / {screen === "controls" ? "GAMES" : screen === "smoke" ? "TESTING" : screen === "prizes" ? "PRIZES" : screen === "checkIn" ? "CHECK IN" : "GRAND PRIZE"}</p>
          <h1>{screen === "controls" ? "Games" : screen === "smoke" ? "Testing" : screen === "prizes" ? "Prize control" : screen === "checkIn" ? "Check in" : "Grand prize"}</h1>
          <p>{screen === "controls" ? "Choose a game, then manage its individual parts." : screen === "smoke" ? "Walk through the prize journey and inspect the results." : screen === "prizes" ? "Keep your prize inventory ready for the next player." : screen === "checkIn" ? "Validate emailed final-drawing codes as contestants arrive." : "Watch live registration counts, run the server-side draw, and reveal the committed winner."}</p>
        </header>
        <section hidden={screen !== "controls"} aria-label="Game controls">
          <div className="game-selector">
            <div><label htmlFor="game-select">Selected game</label><select id="game-select" defaultValue="game-box"><option value="game-box">Game Box</option></select></div>
            <p>Game Box is the first available game. More games will appear here as they are added.</p>
          </div>
          <div className="section-heading"><div><p className="eyebrow">GAME BOX</p><h2>Game controls</h2></div><button className="refresh-button" disabled={loading || gameModeBusy || settingKey !== null || togglingId !== null} onClick={loadState}>{loading ? "Refreshing..." : "Refresh state"}</button></div>
          <div className="control-panel">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "1rem",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: gameModeEnabled ? "#f0fdf4" : "#fdecea",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>Game Mode: {gameModeEnabled ? "ON" : "OFF"}</div>
                <div style={{ fontSize: "0.85rem", color: "#555" }}>
                  {gameModeEnabled
                    ? "Completing a device shows the QR code and prize claim flow."
                    : "Completing a device just shows a success message — no prize claim, nothing recorded."}
                </div>
              </div>
              <button
                onClick={toggleGameMode}
                disabled={gameModeBusy || loading}
                aria-label={`Turn Game Mode ${gameModeEnabled ? "off" : "on"}`}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: 6,
                  border: "none",
                  fontWeight: 600,
                  color: "#fff",
                  background: gameModeEnabled ? "#16a34a" : "#9ca3af",
                  cursor: gameModeBusy ? "wait" : "pointer",
                  opacity: gameModeBusy ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {gameModeBusy ? "Saving…" : gameModeEnabled ? "Turn Off" : "Turn On"}
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem",
                padding: "1rem",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: !plinko ? "#f3f4f6" : plinko.gameModeActive ? "#f0fdf4" : "#fdecea",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  Plinko Game Mode: {plinko ? (plinko.gameModeActive ? "ON" : "OFF") : "unavailable"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#555" }}>
                  {plinkoNote
                    ? plinkoNote
                    : plinko?.gameModeActive
                      ? "Drops are scored: the display shows the QR code, entries and prize wheel spin."
                      : "The display just shows which bucket the puck landed in — no QR, no entries, nothing recorded."}
                </div>
              </div>
              <button
                onClick={togglePlinkoGameMode}
                disabled={plinkoBusy || !plinko}
                aria-label={`Turn Plinko Game Mode ${plinko?.gameModeActive ? "off" : "on"}`}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: 6,
                  border: "none",
                  fontWeight: 600,
                  color: "#fff",
                  background: plinko?.gameModeActive ? "#16a34a" : "#9ca3af",
                  cursor: plinkoBusy ? "wait" : plinko ? "pointer" : "not-allowed",
                  opacity: plinkoBusy || !plinko ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {plinkoBusy ? "Saving…" : plinko?.gameModeActive ? "Turn Off" : "Turn On"}
              </button>
            </div>

            {error && (
              <p role="alert" style={{ background: "#fdecea", color: "#611a15", padding: "0.75rem 1rem", borderRadius: 6 }}>
                {error}
              </p>
            )}

            <h3>Device modes</h3>
            <p className="section-description">Choose what the kiosk displays. Enable or disable each device mode using its toggle.</p>
            {loading ? (
              <p>Loading…</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                <ModeTile
                  label="Demo / Info"
                  active={activeSlug === null}
                  busy={settingKey === DEMO_INFO_KEY}
                  onClick={() => setMode(null, null, null)}
                />
                {profiles.map((p) => (
                  <ModeTile
                    key={p.id}
                    label={p.name}
                    active={activeSlug === p.deviceSlug}
                    busy={settingKey === p.deviceSlug}
                    enabled={p.isEnabled}
                    toggling={togglingId === p.id}
                    onClick={() => setMode(p.id, p.deviceSlug, p.name)}
                    onToggleEnabled={() => toggleDeviceEnabled(p)}
                  />
                ))}
              </div>
            )}

            {!loading && profiles.length === 0 && (
              <p style={{ color: "#555", marginTop: "1rem" }}>
                No devices configured yet — author the 12 <code>andy_deviceprofile</code> rows in
                Dataverse to populate this list (GAME_MODE_PLAN.md §11).
              </p>
            )}
          </div>
        </section>
        <section className="tool-panel" hidden={screen !== "smoke"} aria-label="Prize claim smoke test">
          {visited.has("smoke") && <SmokeTest profiles={profiles} />}
        </section>
        <section className="tool-panel" hidden={screen !== "prizes"} aria-label="Prize management">
          {visited.has("prizes") && <PrizeManagement />}
        </section>
        <section className="tool-panel check-in-panel" hidden={screen !== "checkIn"} aria-label="Grand prize check-in">
          {visited.has("checkIn") && <GrandPrizeCheckIn />}
        </section>
        <section className="tool-panel drawing-panel" hidden={screen !== "drawing"} aria-label="Grand prize drawing">
          {visited.has("drawing") && <GrandPrizeDrawing presentationMode={presentationMode} />}
        </section>
      </main>
    </div>
  );
}

function ModeTile({
  label,
  active,
  busy,
  enabled = true,
  toggling = false,
  onClick,
  onToggleEnabled,
}: {
  label: string;
  active: boolean;
  busy: boolean;
  enabled?: boolean;
  toggling?: boolean;
  onClick: () => void;
  onToggleEnabled?: () => void;
}) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 8,
        border: active ? "2px solid #2563eb" : "1px solid #d1d5db",
        background: !enabled ? "#f3f4f6" : active ? "#eff6ff" : "#fff",
        opacity: enabled ? 1 : 0.6,
      }}
    >
      <button
        onClick={onClick}
        disabled={busy || !enabled}
        style={{
          width: "100%",
          padding: "1rem",
          paddingRight: onToggleEnabled ? "2.5rem" : "1rem",
          border: "none",
          background: "transparent",
          fontWeight: active ? 600 : 400,
          cursor: busy || !enabled ? (enabled ? "wait" : "not-allowed") : "pointer",
          textAlign: "left",
          color: "inherit",
        }}
      >
        {label}
        {active && <div style={{ fontSize: "0.75rem", color: "#2563eb", marginTop: 4 }}>ACTIVE</div>}
        {!enabled && <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: 4 }}>DISABLED</div>}
      </button>
      {onToggleEnabled && (
        <button
          onClick={onToggleEnabled}
          disabled={toggling}
          aria-label={enabled ? `Disable ${label}` : `Enable ${label}`}
          title={enabled ? "Disable this mode" : "Enable this mode"}
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            width: "1.75rem",
            height: "1.75rem",
            borderRadius: "50%",
            border: "1px solid #d1d5db",
            background: enabled ? "#fff" : "#e5e7eb",
            cursor: toggling ? "wait" : "pointer",
            fontSize: "0.9rem",
            lineHeight: 1,
            opacity: toggling ? 0.6 : 1,
          }}
        >
          {enabled ? "⏸" : "▶"}
        </button>
      )}
    </div>
  );
}
