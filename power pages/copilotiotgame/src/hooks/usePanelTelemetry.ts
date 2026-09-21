import { useEffect, useState } from "react";
import { useSignalR } from "../context/SignalRContext";
import type { PanelTelemetry, TelemetryMessage } from "../types/telemetry";

/** The Pi sends a heartbeat every 30s, so anything older than this means the link is down. */
const STALE_AFTER_MS = 45_000;

interface Reading {
  data: PanelTelemetry;
  receivedAt: number;
  revision: number;
}

export interface PanelLink {
  /** Latest reading for this device while the link is live, otherwise null. */
  reading: PanelTelemetry | null;
  isLive: boolean;
  /** Whole seconds since the last reading; null before the first one. */
  ageSeconds: number | null;
}

/**
 * Live panel state from the Function App's SendTelemetryUpdate broadcast. Only readings
 * for `deviceSlug` that carry `controls` count -- mode_change events have no state, and a
 * reading for another mode is left over from before the kiosk switched.
 */
export function usePanelTelemetry(deviceSlug: string): PanelLink {
  const { connection, isConnected, connectionRevision } = useSignalR();
  const [latest, setLatest] = useState<Reading | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!connection) return;
    const handler = (message: TelemetryMessage) => {
      const data = message?.data;
      if (!data?.controls || data.deviceSlug !== deviceSlug) return;
      setLatest({ data, receivedAt: Date.now(), revision: connectionRevision });
    };
    connection.on("SendTelemetryUpdate", handler);
    return () => {
      connection.off("SendTelemetryUpdate", handler);
    };
  }, [connection, deviceSlug, connectionRevision]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ageMs = latest ? Math.max(0, now - latest.receivedAt) : null;
  const isLive = isConnected && latest?.revision === connectionRevision && ageMs !== null && ageMs < STALE_AFTER_MS;
  return {
    reading: isLive && latest ? latest.data : null,
    isLive,
    ageSeconds: ageMs === null ? null : Math.floor(ageMs / 1000),
  };
}
