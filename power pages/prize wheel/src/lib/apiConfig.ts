/**
 * Base URL of the azure/functions/game/ Functions backend. Not a secret -- overridable via
 * VITE_API_BASE_URL (see .env.example) for local dev against `func start`,
 * defaults to the deployed Function App otherwise.
 */
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://func-aw-iot-game-v2.azurewebsites.net";

/**
 * Privacy notice shown beside the marketing opt-in. Set VITE_PRIVACY_NOTICE_URL once the notice
 * exists (docs/PREFERENCE_CENTER_DESIGN.md); until then the link is simply not shown.
 */
export const PRIVACY_NOTICE_URL = (import.meta.env.VITE_PRIVACY_NOTICE_URL as string | undefined) ?? "";

