import { useNavigate } from "react-router-dom";
import { DEVICE_PROFILES } from "../data/deviceProfiles";
import { DemoGearMenu } from "../components/DemoGearMenu";
import { SystemMap } from "../components/SystemMap";
import { WalkthroughPanel } from "../components/WalkthroughPanel";
import { STANDARD_WALKTHROUGH } from "../data/walkthrough";
import { useWalkthrough } from "../hooks/useWalkthrough";
import { useSignalR } from "../context/SignalRContext";
import "../styles/system-map.css";

export function KioskInfoPage({ activeSlug }: { activeSlug?: string | null }) {
  const { isConnected } = useSignalR();
  const navigate = useNavigate();
  const walkthrough = useWalkthrough(STANDARD_WALKTHROUGH.steps);
  const activeDevice = activeSlug ? DEVICE_PROFILES[activeSlug] : undefined;
  return <main className="system-map-page">
    <header className="map-page-header"><div><span className="map-eyebrow">RESTORE &amp; SPIN / DEMO</span><h1>System Map</h1></div>
      <div className="map-page-actions"><span className="map-connection" role="status">Live feed: {isConnected ? "connected" : "disconnected"}</span>
        {activeDevice && <button onClick={() => navigate(`/kiosk/${activeDevice.slug}`)}>Return to {activeDevice.label}</button>}
      </div>
    </header>
    <div className="map-intro-row">
      {!walkthrough.active && <p className="map-intro">From a switch on the box to a live instrument and a prize. Select a component to explore its role and connections.</p>}
      <WalkthroughPanel walkthrough={walkthrough} />
    </div>
    <SystemMap step={walkthrough.step} />
    <footer className="map-legend"><span className="edge">Edge</span><span className="cloud">Azure / Cloud</span><span className="platform">Power Platform</span><span>Architecture view &middot; lines do not indicate live health</span></footer>
    <details className="map-how"><summary>Demo / How to play</summary><ol><li>Staff choose a device in Game Box Control.</li><li>Use the physical switches and cables to restore it. Open the gear menu for required positions, or select Help Fix for guidance.</li><li>When Game Mode is on, scan the win QR on your phone to spin for a prize. With Game Mode off, the kiosk shows a success message.</li></ol></details>
    <DemoGearMenu currentSlug="info" azureConnected={isConnected} />
  </main>;
}
