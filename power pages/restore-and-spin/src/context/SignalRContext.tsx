import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL } from "../lib/apiConfig";

interface SignalRContextValue {
  connection: signalR.HubConnection | null;
}

const SignalRContext = createContext<SignalRContextValue>({ connection: null });

export function useSignalR() {
  return useContext(SignalRContext);
}

/**
 * Opens one SignalR connection for the whole app and keeps it alive across
 * route changes (GAME_MODE_PLAN.md §4/§4a) -- connects via the Function
 * App's /api/negotiate endpoint, which returns an Azure SignalR Service
 * URL + access token; the client library handles that redirect
 * transparently once pointed at the negotiate-capable base path.
 *
 * No "already started" ref guard here on purpose -- React 19 StrictMode's
 * dev-mode mount/cleanup/mount double-invoke needs this effect to actually
 * re-run and create a fresh connection on the second mount; a guard that
 * skips that leaves the connection permanently stopped in dev after
 * StrictMode's first cleanup fires. The `cancelled` flag below just makes
 * sure a connection stopped mid-negotiation never calls setConnection.
 */
export function SignalRProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    let cancelled = false;

    const conn = new signalR.HubConnectionBuilder()
      // withCredentials: false -- /api/negotiate is anonymous auth and needs
      // no cookies; the browser's default credentialed CORS preflight
      // doesn't match the Function App's CORS config otherwise.
      .withUrl(`${API_BASE_URL}/api`, { withCredentials: false })
      .withAutomaticReconnect()
      .build();

    conn
      .start()
      .then(() => {
        if (!cancelled) setConnection(conn);
      })
      .catch((err) => {
        if (!cancelled) console.error("SignalR connection failed", err);
      });

    return () => {
      cancelled = true;
      conn.stop();
    };
  }, []);

  return <SignalRContext.Provider value={{ connection }}>{children}</SignalRContext.Provider>;
}
