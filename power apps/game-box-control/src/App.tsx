import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, SET_MODE_FUNCTION_KEY } from "./apiConfig";

interface DeviceProfile {
  id: string;
  name: string;
  deviceSlug: string;
}

interface KioskState {
  deviceSlug: string | null;
  deviceName: string | null;
}

const DEMO_INFO_KEY = "__demo-info__";

/**
 * Staff control device for the Restore & Spin kiosk (GAME_MODE_PLAN.md §4a).
 * Picking a tile here calls POST /api/set-mode, which writes
 * andy_gameboxstate and broadcasts the change to every open kiosk screen
 * over SignalR -- confirmed live 2026-09-08, see power pages/restore-and-spin.
 */
export default function App() {
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingKey, setSettingKey] = useState<string | null>(null);

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

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Game Box Control</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Pick the device the kiosk should show. Changes take effect immediately on the live
        kiosk screen.
      </p>

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
              onClick={() => setMode(p.id, p.deviceSlug, p.name)}
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
  onClick,
}: {
  label: string;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        padding: "1rem",
        borderRadius: 8,
        border: active ? "2px solid #2563eb" : "1px solid #d1d5db",
        background: active ? "#eff6ff" : "#fff",
        fontWeight: active ? 600 : 400,
        cursor: busy ? "wait" : "pointer",
        opacity: busy ? 0.6 : 1,
        textAlign: "left",
      }}
    >
      {label}
      {active && <div style={{ fontSize: "0.75rem", color: "#2563eb", marginTop: 4 }}>ACTIVE</div>}
    </button>
  );
}
