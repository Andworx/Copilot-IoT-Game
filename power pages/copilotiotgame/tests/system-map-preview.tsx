// Development-only, no backend or SignalR provider.
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { KioskInfoPage } from "../src/pages/KioskInfoPage";
import "../src/styles/theme.css";
Object.assign(window, {
  render_game_to_text: () => JSON.stringify({ page: "System Map", nodes: [...document.querySelectorAll(".map-node strong")].map(el => el.textContent), details: document.querySelector("dialog[open] h2")?.textContent ?? null, interaction: "read-only architecture" }),
  advanceTime: async () => {},
});
createRoot(document.getElementById("root")!).render(<BrowserRouter><KioskInfoPage activeSlug="thermostat" /></BrowserRouter>);
