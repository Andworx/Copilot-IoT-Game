import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "../lib/apiConfig";

interface SignalRContextValue {
  connection: signalR.HubConnection | null;
  isConnected: boolean;
  /** Changes after connection recovery or browser resume; refresh missed state. */
  connectionRevision: number;
}

const SignalRContext = createContext<SignalRContextValue>({ connection: null, isConnected: false, connectionRevision: 0 });

export function useSignalR() {
  return useContext(SignalRContext);
}

/** One connection per mounted provider; retries also cover failed initial negotiation. */
export function SignalRProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionRevision, setConnectionRevision] = useState(0);

  useEffect(() => {
    let disposed = false;
    let starting = false;
    let failures = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}/api`, { withCredentials: false })
      // Default SignalR reconnect stops after four attempts. A kiosk must recover
      // even when a sleeping browser or offline network outlasts that window.
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
        [0, 2000, 10000, 30000][Math.min(previousRetryCount, 3)] })
      .build();

    function connected() {
      if (disposed) return;
      failures = 0;
      setIsConnected(true);
      setConnectionRevision(value => value + 1);
    }
    function scheduleStart() {
      if (disposed || retryTimer !== undefined) return;
      const delay = Math.min(30000, 5000 * 2 ** Math.min(failures++, 3));
      retryTimer = setTimeout(() => { retryTimer = undefined; void start(); }, delay);
    }
    async function start() {
      if (disposed || starting || conn.state !== signalR.HubConnectionState.Disconnected) return;
      starting = true;
      try {
        await conn.start();
        connected();
      } catch {
        if (!disposed) { setIsConnected(false); scheduleStart(); }
      } finally {
        starting = false;
      }
    }
    function resume() {
      if (disposed || document.visibilityState === "hidden") return;
      if (conn.state === signalR.HubConnectionState.Disconnected) {
        clearTimeout(retryTimer);
        retryTimer = undefined;
        void start();
      } else if (conn.state === signalR.HubConnectionState.Connected) {
        // Re-read server mode even if the transport has not noticed a missed event.
        connected();
      }
    }
    function offline() { if (!disposed) setIsConnected(false); }

    conn.onreconnecting(() => { if (!disposed) setIsConnected(false); });
    conn.onreconnected(connected);
    conn.onclose(() => { if (!disposed) { setIsConnected(false); scheduleStart(); } });
    // Publish the object before start, so consumers can subscribe before the first message.
    setConnection(conn);
    setIsConnected(false);
    void start();
    window.addEventListener("online", resume);
    window.addEventListener("offline", offline);
    window.addEventListener("pageshow", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", offline);
      window.removeEventListener("pageshow", resume);
      document.removeEventListener("visibilitychange", resume);
      void conn.stop().catch(() => {});
    };
  }, []);

  return <SignalRContext.Provider value={{ connection, isConnected, connectionRevision }}>{children}</SignalRContext.Provider>;
}
