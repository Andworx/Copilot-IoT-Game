/**
 * Base URL of the azure/functions/game/ Functions backend. Not a secret -- overridable via
 * VITE_API_BASE_URL (see .env.example) for local dev against `func start`,
 * defaults to the deployed Function App otherwise.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://func-aw-azcom-iot-game.azurewebsites.net";

/**
 * Base URL of the standalone prize wheel SPA (power pages/prize wheel) -- what the
 * kiosk's win-screen QR points at, per PRIZE_ENGINE_SPEC.md §3 step 2.
 */
export const PRIZE_WHEEL_URL =
  (import.meta.env.VITE_PRIZE_WHEEL_URL as string | undefined) ??
  "https://andworxprizewheel.powerappsportals.com";
