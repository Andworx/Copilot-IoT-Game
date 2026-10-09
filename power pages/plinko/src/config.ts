export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://func-aw-iot-game-v2.azurewebsites.net";

export const PRIZE_WHEEL_URL =
  (import.meta.env.VITE_PRIZE_WHEEL_URL as string | undefined) ??
  "https://andworxprizewheel.powerappsportals.com";