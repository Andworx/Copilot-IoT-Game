// Development-only entry point, not included in the production Vite build.
import { createRoot } from "react-dom/client";
import { PanelSurface } from "../src/components/surfaces/PanelSurface";
import { DEVICE_PROFILES } from "../src/data/deviceProfiles";
import { surfaceFixtures } from "../src/data/surfaceFixtures";
import { HelpFixBar } from "../src/components/HelpFixBar";
import "../src/styles/theme.css";

const params = new URLSearchParams(location.search);
const device = DEVICE_PROFILES[params.get("mode") ?? "thermostat"];
const fixtures = surfaceFixtures(device);
const fixtureName = params.get("state") ?? "fault";
const fixture = fixtures[fixtureName as keyof typeof fixtures] ?? fixtures.fault;
const { state, connection } = fixture;
const win = device.checkWin(state);
const lamps = device.computeLamps(state, win);
Object.assign(window, {
  render_game_to_text: () => JSON.stringify({ mode: device.slug, fixture: fixtureName, state, win, lamps, connection, interaction: "physical panel only" }),
  advanceTime: async () => {}, // Fixtures have no time-dependent state.
});

createRoot(document.getElementById("root")!).render(
  <div className="kiosk-screen" data-skin={device.slug}>
    <div className="motif motif-thermostat" />
    <header className="kiosk-header"><div><span className="sector-tag">{device.sector}</span><h2>{device.label}</h2></div><span className="position-badge">MODE {device.modeIndex} / 12</span></header>
    <div className="fault-line" data-mode={win ? "ok" : "fault"} dangerouslySetInnerHTML={{ __html: !connection.isLive ? "Panel readings unavailable. Waiting for a live connection." : win ? device.okText : device.faultText }} />
    <div className="panel-body"><PanelSurface device={device} state={state} lampColors={lamps} win={win} controls={device.restoreSequence} connection={connection} /></div>
    {!win && <HelpFixBar isAlert steps={device.steps} getPrompt={() => "fixture preview"} />}
  </div>,
);
