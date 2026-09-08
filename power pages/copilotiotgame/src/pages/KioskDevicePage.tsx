import { useParams } from "react-router-dom";

/**
 * Placeholder only -- proves routing/SignalR mode-swap works before any
 * per-device UI is ported over. Real layouts come later, one device at a
 * time (GAME_MODE_PLAN.md).
 */
export function KioskDevicePage() {
  const { deviceSlug } = useParams();

  return (
    <div style={{ padding: 24 }}>
      <h1>Device: {deviceSlug}</h1>
      <p>Placeholder panel -- real UI for this device not built yet.</p>
    </div>
  );
}
