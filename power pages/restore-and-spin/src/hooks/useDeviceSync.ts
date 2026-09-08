import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSignalR } from "../context/SignalRContext";
import { API_BASE_URL } from "../lib/apiConfig";

interface KioskState {
  deviceSlug: string | null;
  deviceName: string | null;
}

function routeForSlug(deviceSlug: string | null): string {
  return deviceSlug ? `/kiosk/${deviceSlug}` : "/kiosk/info";
}

/**
 * Keeps the kiosk on whichever device is active, per GAME_MODE_PLAN.md §4a:
 * fetch current state once on load, then rely on the live SignalR
 * `deviceChanged` broadcast for updates after that -- no polling loop.
 *
 * The initial fetch only navigates away if the tab is sitting on the
 * landing route (`/` or `/kiosk/info`) -- an explicit deep link to
 * `/kiosk/<slug>` (the documented dev-testing convenience in this app's
 * README) is left alone on load, but still follows live broadcasts
 * afterwards like every other route does.
 */
export function useDeviceSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const { connection } = useSignalR();
  const lastSlugRef = useRef<string | null>(null);
  const isLandingRouteOnMount = useRef(
    location.pathname === "/" || location.pathname === "/kiosk/info"
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/kiosk-state`)
      .then((res) => res.json())
      .then((data: KioskState) => {
        if (cancelled) return;
        lastSlugRef.current = data.deviceSlug;
        if (isLandingRouteOnMount.current) {
          navigate(routeForSlug(data.deviceSlug), { replace: true });
        }
      })
      .catch((err) => console.error("Failed to fetch kiosk-state", err));
    return () => {
      cancelled = true;
    };
    // Intentionally mount-only -- this is the one-time "where do things
    // stand" fetch, not a dependency-driven refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!connection) return;
    const handler = (payload: KioskState) => {
      if (payload.deviceSlug === lastSlugRef.current) return; // dedupe
      lastSlugRef.current = payload.deviceSlug;
      navigate(routeForSlug(payload.deviceSlug));
    };
    connection.on("deviceChanged", handler);
    return () => {
      connection.off("deviceChanged", handler);
    };
  }, [connection, navigate]);
}
