import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { KioskInfoPage } from "./pages/KioskInfoPage";
import { KioskDevicePage } from "./pages/KioskDevicePage";
import { PlaySpinPage } from "./pages/PlaySpinPage";
import { useDeviceSync } from "./hooks/useDeviceSync";

/**
 * React Router reuses the same component instance across param changes on the same
 * route — it does not remount just because `:deviceSlug` changed. Keying on the slug
 * here forces a full unmount/remount on every dial change, which is what gives us the
 * "no stale state carries over" guarantee from GAME_MODE_PLAN.md §4 without a hard
 * page reload.
 */
function KeyedKioskDevicePage() {
  const { deviceSlug } = useParams();
  return <KioskDevicePage key={deviceSlug} />;
}

/** Routes per GAME_MODE_PLAN.md §6. */
export default function App() {
  // Mode sync (GAME_MODE_PLAN.md §4a) needs Router context (useNavigate),
  // so it lives inside App, not around it in main.tsx like SignalRProvider.
  useDeviceSync();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/kiosk/info" replace />} />
      <Route path="/kiosk/info" element={<KioskInfoPage />} />
      <Route path="/kiosk/:deviceSlug" element={<KeyedKioskDevicePage />} />
      <Route path="/play-spin" element={<PlaySpinPage />} />
    </Routes>
  );
}
