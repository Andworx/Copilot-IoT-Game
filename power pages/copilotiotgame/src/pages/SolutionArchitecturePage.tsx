import { useNavigate } from "react-router-dom";
import { DemoGearMenu } from "../components/DemoGearMenu";
import { SystemMap } from "../components/SystemMap";
import { useSignalR } from "../context/SignalRContext";
import { SOLUTION_LINKS, SOLUTION_NODES } from "../data/systemMap";
import "../styles/system-map.css";

const SECURITY_NOTES = [
  "The Pi reaches Azure private endpoints through the travel-router OpenVPN tunnel and private DNS resolver.",
  "Staff controls use a per-user OAuth custom connector to a separate public Entra-protected staff API.",
  "The game Function keeps kiosk, prize, telemetry, SignalR and agent-token flows separate from staff side effects.",
  "Prize claims stay anonymous but require the kiosk-generated claim token; browser clients never connect directly to the panel controller.",
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
    <p className="map-intro">A demo view of the complete solution: physical restore box, travel-router VPN, private Azure endpoints, player phone, staff connector/API boundary, Power Pages, Dataverse, Copilot Studio, and deployment paths.</p>
    <SystemMap nodes={SOLUTION_NODES} links={SOLUTION_LINKS} ariaLabel="Interactive secure networking solution architecture" />
    <section className="security-strip" aria-label="Secure networking notes">
      {SECURITY_NOTES.map((note, index) => <article key={note}><span>{String(index + 1).padStart(2, "0")}</span><p>{note}</p></article>)}
    </section>
    <footer className="map-legend"><span className="edge">Edge clients and devices</span><span className="cloud">Azure boundary</span><span className="platform">Power Platform assets</span><span>Demo architecture view - select any node for detail</span></footer>
    <DemoGearMenu currentSlug="solution" azureConnected={isConnected} />
  </main>;
}