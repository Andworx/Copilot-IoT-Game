/**
 * Base URL of the azure/ Functions backend. Not a secret -- overridable via
 * VITE_API_BASE_URL for local dev, defaults to the deployed Function App.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://func-aw-azcom-copilot-iot-game.azurewebsites.net";

/**
 * set-mode's function key. This DOES end up in the built client bundle --
 * env vars only keep it out of source control, not out of shipped JS. Fine
 * as a stopgap since this app is itself gated behind Entra ID sign-in (the
 * whole reason it's a Code App and not embedded in the public kiosk SPA),
 * but the real fix is validating an Entra ID token on the Function side
 * instead of a function key -- tracked in azure/README.md, not done yet.
 */
export const SET_MODE_FUNCTION_KEY = (import.meta.env.VITE_SET_MODE_FUNCTION_KEY as string | undefined) ?? "";

/** toggle-device's function key. Same posture/caveat as SET_MODE_FUNCTION_KEY above. */
export const TOGGLE_DEVICE_FUNCTION_KEY =
  (import.meta.env.VITE_TOGGLE_DEVICE_FUNCTION_KEY as string | undefined) ?? "";

/** set-game-mode's function key. Same posture/caveat as SET_MODE_FUNCTION_KEY above. */
export const SET_GAME_MODE_FUNCTION_KEY =
  (import.meta.env.VITE_SET_GAME_MODE_FUNCTION_KEY as string | undefined) ?? "";
