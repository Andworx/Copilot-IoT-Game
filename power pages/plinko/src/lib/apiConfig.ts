/**
 * Base URL of the azure/ Functions backend. Not a secret -- overridable via
 * VITE_API_BASE_URL for local dev against `func start`, defaults to the deployed
 * Function App otherwise. Same backend and SignalR `gamebox` hub as the IoT kiosk.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://func-aw-azcom-iot-game.azurewebsites.net";

/**
 * Base URL of the shared prize wheel SPA (power pages/prize wheel). Plinko reuses it:
 * the QR carries the Plinko Prize Claim token, and claim-prize awards the small prize
 * plus the entries recorded on the Plinko Play.
 */
export const PRIZE_WHEEL_URL =
  (import.meta.env.VITE_PRIZE_WHEEL_URL as string | undefined) ??
  "https://andworxprizewheel.powerappsportals.com";

/**
 * Which Plinko Station this display follows (`andy_stationslug`). One display per
 * board; override with `?station=` so a second board needs no rebuild.
 */
export const STATION_SLUG =
  new URLSearchParams(window.location.search).get("station") ??
  (import.meta.env.VITE_PLINKO_STATION as string | undefined) ??
  "plinko-1";
