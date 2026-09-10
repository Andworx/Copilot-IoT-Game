import { useCallback, useEffect, useState } from "react";
import {
  API_BASE_URL,
  SET_MODE_FUNCTION_KEY,
  SET_GAME_MODE_FUNCTION_KEY,
  TOGGLE_DEVICE_FUNCTION_KEY,
} from "./apiConfig";

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

/**
 * Staff control device for the Restore & Spin kiosk (GAME_MODE_PLAN.md §4a).
 * Picking a tile here calls POST /api/set-mode, which writes
 * andy_gameboxstate and broadcasts the change to every open kiosk screen
 * over SignalR -- confirmed live 2026-09-08, see power pages/restore-and-spin.
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
export default function App() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [gameModeEnabled, setGameModeEnabledState] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingKey, setSettingKey] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [gameModeBusy, setGameModeBusy] = useState(false);

  const loadState = useCallback(async () => {
    setError(null);
    try {
      const [profilesRes, stateRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/device-profiles`),
        fetch(`${API_BASE_URL}/api/kiosk-state`),
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
      const res = await fetch(`${API_BASE_URL}/api/set-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-functions-key": SET_MODE_FUNCTION_KEY },
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
      const res = await fetch(`${API_BASE_URL}/api/toggle-device`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-functions-key": TOGGLE_DEVICE_FUNCTION_KEY },
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

  async function toggleGameMode() {
    setGameModeBusy(true);
    setError(null);
    const next = !gameModeEnabled;
    try {
      const res = await fetch(`${API_BASE_URL}/api/set-game-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-functions-key": SET_GAME_MODE_FUNCTION_KEY },
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

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Game Box Control</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Pick the device the kiosk should show. Changes take effect immediately on the live
        kiosk screen.
      </p>

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

      {error && (
        <p style={{ background: "#fdecea", color: "#611a15", padding: "0.75rem 1rem", borderRadius: 6 }}>
          {error}
        </p>
      )}

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
    </main>
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
