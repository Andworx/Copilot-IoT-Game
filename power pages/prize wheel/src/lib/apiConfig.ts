/**
 * Base URL of the azure/ Functions backend. Not a secret -- overridable via
 * VITE_API_BASE_URL (see .env.example) for local dev against `func start`,
 * defaults to the deployed Function App otherwise.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://func-aw-azcom-iot-game.azurewebsites.net";
