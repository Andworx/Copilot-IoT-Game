import { useNavigate } from "react-router-dom";
import { DemoGearMenu } from "../components/DemoGearMenu";
import { SystemMap } from "../components/SystemMap";
import { useSignalR } from "../context/SignalRContext";
import { SOLUTION_LINKS, SOLUTION_NODES } from "../data/systemMap";
import "../styles/system-map.css";

const SECURITY_NOTES = [
  "Public browsers only talk to Power Pages and the Function App origins allowed by CORS and platform policy.",
  "The Pi sends device telemetry through IoT Hub; browser clients never connect directly to the panel controller.",
  "Azure Functions use managed identity for Event Hub and Dataverse access, keeping runtime secrets out of the frontends.",
  "Prize claims stay anonymous but require the kiosk-generated claim token; staff side effects remain on the separate control path.",
];

export function SolutionArchitecturePage({ activeSlug }: { activeSlug?: string | null }) {
  const { isConnected } = useSignalR();
  const navigate = useNavigate();

  return <main className="system-map-page solution-map-page">
    <header className="map-page-header">
      <div><span className="map-eyebrow">FULL SOLUTION / SECURE NETWORKING</span><h1>Copilot IoT Game Breakdown</h1></div>
      <div className="map-page-actions">
        <span className="map-connection" role="status">Live feed: {isConnected ? "connected" : "disconnected"}</span>
        <button type="button" onClick={() => navigate(activeSlug ? `/kiosk/${activeSlug}` : "/kiosk/info")}>Return to game</button>
      </div>
    </header>
    <p className="map-intro">A demo view of the complete solution: physical restore box, player phone, staff controls, Azure event path, Power Pages, Dataverse, Copilot Studio, and the deployment boundary.</p>
    <SystemMap nodes={SOLUTION_NODES} links={SOLUTION_LINKS} ariaLabel="Interactive secure networking solution architecture" />
    <section className="security-strip" aria-label="Secure networking notes">
      {SECURITY_NOTES.map((note, index) => <article key={note}><span>{String(index + 1).padStart(2, "0")}</span><p>{note}</p></article>)}
    </section>
    <footer className="map-legend"><span className="edge">Edge clients and devices</span><span className="cloud">Azure boundary</span><span className="platform">Power Platform assets</span><span>Demo architecture view - select any node for detail</span></footer>
    <DemoGearMenu currentSlug="solution" azureConnected={isConnected} />
  </main>;
}