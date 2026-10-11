import { useNavigate, useSearchParams } from "react-router-dom";
import { DEVICE_PROFILES } from "../data/deviceProfiles";
import { DemoGearMenu } from "../components/DemoGearMenu";
import { SystemMap } from "../components/SystemMap";
import { WalkthroughPanel } from "../components/WalkthroughPanel";
import { MAP_LINKS, MAP_NODES, SOLUTION_LINKS, SOLUTION_NODES } from "../data/systemMap";
import { ADVANCED_WALKTHROUGH, STANDARD_WALKTHROUGH } from "../data/walkthrough";
import { useWalkthrough } from "../hooks/useWalkthrough";
import { useSignalR } from "../context/SignalRContext";
import "../styles/system-map.css";

const VIEWS = {
  standard: { eyebrow: "RESTORE & SPIN / DEMO", heading: "System Map", walkthrough: STANDARD_WALKTHROUGH, nodes: MAP_NODES, links: MAP_LINKS, ariaLabel: "Interactive system architecture", intro: "From a switch on the box to a live instrument and a prize. Select a component to explore its role and connections." },
  advanced: { eyebrow: "FULL SOLUTION / SECURE NETWORKING", heading: "Architecture & Networking", walkthrough: ADVANCED_WALKTHROUGH, nodes: SOLUTION_NODES, links: SOLUTION_LINKS, ariaLabel: "Interactive secure networking solution architecture", intro: "The deeper networking and security path: demo LAN, travel-router VPN, private Azure endpoints, the staff Entra API boundary, and the public attendee prize flow. Select a component for detail." },
} as const;

type ViewKey = keyof typeof VIEWS;

export function KioskInfoPage({ activeSlug }: { activeSlug?: string | null }) {
  const { isConnected } = useSignalR();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: ViewKey = searchParams.get("view") === "advanced" ? "advanced" : "standard";
  const current = VIEWS[view];
  // A different dataset's step array resets the engine (see useWalkthrough), so the
  // walkthrough clears when the presenter switches Standard/Advanced.
  const walkthrough = useWalkthrough(current.walkthrough.steps);
  const activeDevice = activeSlug ? DEVICE_PROFILES[activeSlug] : undefined;

  function selectView(next: ViewKey) {
    if (next === view) return;
    setSearchParams(prev => { const p = new URLSearchParams(prev); if (next === "standard") p.delete("view"); else p.set("view", next); return p; }, { replace: true });
  }

  return <main className={view === "advanced" ? "system-map-page solution-map-page" : "system-map-page"}>
    <header className="map-page-header"><div><span className="map-eyebrow">{current.eyebrow}</span><h1>{current.heading}</h1></div>
      <div className="map-page-actions"><span className="map-connection" role="status">Live feed: {isConnected ? "connected" : "disconnected"}</span>
        {activeDevice && <button onClick={() => navigate(`/kiosk/${activeDevice.slug}`)}>Return to {activeDevice.label}</button>}
      </div>
    </header>
    <div className="map-view-switch" role="group" aria-label="Architecture view">
      {(Object.keys(VIEWS) as ViewKey[]).map(key => <button key={key} type="button" className="map-view-option" aria-pressed={view === key} onClick={() => selectView(key)}>{VIEWS[key].walkthrough.label}</button>)}
    </div>
    <div className="map-intro-row">
      {!walkthrough.active && <p className="map-intro">{current.intro}</p>}
      <WalkthroughPanel walkthrough={walkthrough} />
    </div>
    <SystemMap nodes={current.nodes} links={current.links} ariaLabel={current.ariaLabel} step={walkthrough.step} />
    <footer className="map-legend"><span className="edge">Edge</span><span className="cloud">Azure / Cloud</span><span className="platform">Power Platform</span><span>Architecture view &middot; lines do not indicate live health</span></footer>
    <details className="map-how"><summary>Demo / How to play</summary><ol><li>Staff choose a device in Game Box Control.</li><li>Use the physical switches and cables to restore it. Open the gear menu for required positions, or select Help Fix for guidance.</li><li>When Game Mode is on, scan the win QR on your phone to spin for a prize. With Game Mode off, the kiosk shows a success message.</li></ol></details>
    <DemoGearMenu currentSlug="info" azureConnected={isConnected} />
  </main>;
}
