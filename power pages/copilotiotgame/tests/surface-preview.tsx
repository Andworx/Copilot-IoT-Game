// Development-only entry point, not included in the production Vite build.
import { BrowserRouter } from "react-router-dom";
import { DemoGearMenu } from "../src/components/DemoGearMenu";
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
const { connection } = fixture;
// Exercise actual surface bindings, including keys read only in particular states.
const controlKeys = new Set(device.restoreSequence.map(control => control.key));
const state = new Proxy(fixture.state, {
  get(target, key) {
    if (typeof key === "string" && key !== "toJSON" && !controlKeys.has(key)) {
      throw new Error(`${device.slug}: surface reads unknown telemetry key ${key}`);
    }
    return Reflect.get(target, key);
  },
});
const win = device.checkWin(state, device.requiredCables);
const lamps = device.computeLamps(state, win);
Object.assign(window, {
  render_game_to_text: () => JSON.stringify({ mode: device.slug, fixture: fixtureName, state, win, lamps, connection, interaction: "physical panel only" }),
  advanceTime: async () => {}, // Fixtures have no time-dependent state.
});

createRoot(document.getElementById("root")!).render(
  <BrowserRouter><div className="kiosk-screen" data-skin={device.slug}>
    <div className={`motif motif-${device.slug}`} />
    <header className="kiosk-header"><div><span className="sector-tag">{device.sector}</span><h2>{device.label}</h2></div><span className="position-badge">MODE {device.modeIndex} / 12</span></header>
    <div className="fault-line" data-mode={!connection.isLive ? "unavailable" : win ? "ok" : "fault"} dangerouslySetInnerHTML={{ __html: !connection.isLive ? "Panel readings unavailable. Waiting for a live connection." : win ? device.okText : device.faultText }} />
    <div className="panel-body"><PanelSurface device={device} state={state} lampColors={lamps} win={win} controls={device.restoreSequence} connection={connection} /></div>
    <DemoGearMenu currentSlug={device.slug} />
    {!win && <HelpFixBar isAlert getPrompt={() => "fixture preview"} />}
  </div></BrowserRouter>,
);
