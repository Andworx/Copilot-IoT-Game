import { SOLUTION_LINKS, SOLUTION_NODES, type MapNode, type MapTier } from "../../../copilotiotgame/src/data/systemMap";

// Same node/link model as the kiosk's /kiosk/solution map, laid out as one vertical path for phones.
const icons = import.meta.glob<string>("../../../copilotiotgame/src/assets/system-map/*.svg", { eager: true, query: "?url", import: "default" });

const TIER_LABEL: Record<MapTier, string> = { edge: "Edge: the game box", cloud: "Azure: the cloud path", platform: "Power Platform: what you're using" };
const nodeById = (id: string) => SOLUTION_NODES.find((n) => n.id === id)!;
const linkLabel = (from: string, to: string) => SOLUTION_LINKS.find((l) => l.from === from && l.to === to)?.label ?? "";

/** [node id, label of the arrow leading into it]. Labels come from the shared link list. */
const JOURNEY: Array<[string, string]> = [
  ["box", ""], ["pi", linkLabel("box", "pi")],
  ["iot", linkLabel("pi", "iot")], ["events", linkLabel("iot", "events")],
  ["functions", linkLabel("events", "functions")], ["signalr", linkLabel("functions", "signalr")],
  ["pages", linkLabel("signalr", "pages")], ["wheel", linkLabel("pages", "wheel")],
];
const CLAIM_PATH: Array<[string, string]> = [
  ["functions", linkLabel("wheel", "functions")], ["data", linkLabel("functions", "data")],
];
const EXTRAS = ["phone", "staff", "agent", "gha", "solution"];

function Arrow({ label }: { label: string }) {
  return (
    <div className="dg-arrow" aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 20 34" aria-hidden="true"><path d="M10 0V26M3 19L10 28L17 19" /></svg>
      {label && <span>{label}</span>}
    </div>
  );
}

function Node({ node, here }: { node: MapNode; here?: boolean }) {
  const icon = node.icon ? icons[`../../../copilotiotgame/src/assets/system-map/${node.icon}.svg`] : undefined;
  return (
    <details className={`dg-node ${node.tier}`} data-here={here || undefined}>
      <summary>
        {icon ? <img src={icon} alt="" /> : <span className="dg-dot" aria-hidden="true" />}
        <span className="dg-text"><strong>{node.label}</strong><small>{node.subtitle}</small></span>
        {here && <em>You are here</em>}
      </summary>
      <p>{node.detail}</p>
    </details>
  );
}

function Lane({ steps, firstArrow }: { steps: Array<[string, string]>; firstArrow?: boolean }) {
  // Group consecutive steps by tier so each band reads as one zone.
  const groups: Array<{ tier: MapTier; steps: Array<[string, string]> }> = [];
  for (const step of steps) {
    const tier = nodeById(step[0]).tier;
    const last = groups[groups.length - 1];
    if (last?.tier === tier) last.steps.push(step);
    else groups.push({ tier, steps: [step] });
  }
  return (
    <>
      {groups.map((group, g) => (
        <section key={g} className={`dg-band ${group.tier}`} aria-label={TIER_LABEL[group.tier]}>
          <h4>{TIER_LABEL[group.tier]}</h4>
          {group.steps.map(([id, label], i) => (
            <div key={id + i}>
              {(i > 0 || (g === 0 && firstArrow)) && <Arrow label={label} />}
              <Node node={nodeById(id)} here={id === "wheel"} />
            </div>
          ))}
          {g < groups.length - 1 && <Arrow label={groups[g + 1].steps[0][1]} />}
        </section>
      ))}
    </>
  );
}

export function SolutionDiagram() {
  return (
    <div className="solution-diagram" aria-label="IoT game solution diagram">
      <p className="dg-lead">Follow one move from the box on the table to your prize. Tap any block for details.</p>
      <Lane steps={JOURNEY} />
      <h4 className="dg-sub">Then your claim travels back</h4>
      <Lane steps={CLAIM_PATH} firstArrow />
      <h4 className="dg-sub">Also in the solution</h4>
      <div className="dg-extras">
        {EXTRAS.map((id) => <Node key={id} node={nodeById(id)} />)}
      </div>
    </div>
  );
}
