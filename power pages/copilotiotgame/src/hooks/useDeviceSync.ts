import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSignalR } from "../context/SignalRContext";
import { API_BASE_URL } from "../lib/apiConfig";

interface KioskState { deviceSlug: string | null; }

/** Follow device routes on startup/recovery; keep intentional map exploration local. */
export function useDeviceSync() {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const { pathname, state } = useLocation();
  const [activeSlug, setActiveSlug] = useState<string | null>();
  const exploringRef = useRef(false);
  exploringRef.current = pathname === "/kiosk/info" && state?.explore === true;
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const { connection, connectionRevision } = useSignalR();

  useEffect(() => {
    let disposed = false;
    let eventVersion = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    function apply(data: KioskState, snapshot = false) {
      // Keep phone/prize routes outside live kiosk navigation.
      if (pathRef.current !== "/" && !pathRef.current.startsWith("/kiosk/")) return;
      if (data.deviceSlug !== null && typeof data.deviceSlug !== "string") return;
      setActiveSlug(data.deviceSlug);
      // Gear exploration stays local; an idle info page still follows staff broadcasts.
      if (exploringRef.current || (snapshot && pathRef.current === "/kiosk/info")) return;
      const route = data.deviceSlug ? `/kiosk/${data.deviceSlug}` : "/kiosk/info";
      if (pathRef.current !== route) navigateRef.current(route, { replace: true });
    }
    const changed = (data: KioskState) => {
      eventVersion++;
      apply(data);
    };
    async function refresh() {
      const version = eventVersion;
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch(`${API_BASE_URL}/api/kiosk-state`, { signal: controller.signal });
        if (!response.ok) throw new Error("Kiosk state unavailable");
        const data: KioskState = await response.json();
        // A broadcast received during this request is newer than its snapshot.
        if (!disposed && version === eventVersion) apply(data, true);
      } catch {
        if (!disposed) retryTimer = setTimeout(() => { void refresh(); }, 5000);
      } finally {
        clearTimeout(timeout);
      }
    }
    connection?.on("deviceChanged", changed);
    void refresh();
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(timeout);
      clearTimeout(retryTimer);
      connection?.off("deviceChanged", changed);
    };
  }, [connection, connectionRevision]);
  return activeSlug;
}
