import { useEffect, useRef, useState } from "react";
import { MAP_LINKS, MAP_NODES, type MapLink, type MapNode } from "../data/systemMap";
const icons = import.meta.glob<string>("../assets/system-map/*.svg", { eager: true, query: "?url", import: "default" });

function NodeDetails({ node, links, nodes, close }: { node: MapNode; links: MapLink[]; nodes: MapNode[]; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current!; el.showModal(); return () => el.close(); }, []);
  function dismiss() { ref.current?.close(); close(); }
  return <dialog ref={ref} className="map-details" aria-labelledby="map-detail-title" onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); ref.current?.querySelector<HTMLButtonElement>("button")?.focus(); } }} onCancel={e => { e.preventDefault(); dismiss(); }}>
    <header><div><span>{node.subtitle}</span><h2 id="map-detail-title">{node.label}</h2></div><button autoFocus onClick={dismiss} aria-label="Close component details">Close</button></header>
    <p>{node.detail}</p><h3>Connections</h3><ul>{links.filter(link => link.from === node.id || link.to === node.id).map(link => <li key={`${link.from}-${link.to}`}><strong>{nodes.find(n => n.id === link.from)!.label} &rarr; {nodes.find(n => n.id === link.to)!.label}</strong><br />{link.label}</li>)}</ul>
  </dialog>;
}

export function SystemMap({ nodes = MAP_NODES, links = MAP_LINKS, ariaLabel = "Interactive system architecture" }: { nodes?: MapNode[]; links?: MapLink[]; ariaLabel?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapNode | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  return <>
    <div className="system-map" aria-label={ariaLabel}>
      {(["edge", "cloud", "platform"] as const).map(tier => <div key={tier} className={`map-band ${tier}`}><span>{tier === "platform" ? "POWER PLATFORM" : tier === "cloud" ? "AZURE / CLOUD" : "EDGE"}</span></div>)}
      <svg className="map-links" viewBox="0 0 1000 360" preserveAspectRatio="none" aria-hidden="true">
        {links.map(link => {
          const from = nodes.find(n => n.id === link.from)!; const to = nodes.find(n => n.id === link.to)!;
          const x1 = from.x * 10, y1 = from.y * 3.6, x2 = to.x * 10, y2 = to.y * 3.6;
          const sameRow = from.y === to.y;
          const d = sameRow ? `M ${x1} ${y1} Q ${(x1+x2)/2} ${y1 - 52} ${x2} ${y2}` : `M ${x1} ${y1} C ${x1} ${(y1+y2)/2} ${x2} ${(y1+y2)/2} ${x2} ${y2}`;
          return <path key={`${link.from}-${link.to}`} d={d} data-active={active === link.from || active === link.to} />;
        })}
      </svg>
      {nodes.map(node => <button key={node.id} className={`map-node ${node.tier}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} data-node={node.id} aria-label={`${node.label}: ${node.subtitle}`} aria-haspopup="dialog" onMouseEnter={() => setActive(node.id)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(node.id)} onBlur={() => setActive(null)} onClick={e => { trigger.current = e.currentTarget; setSelected(node); }}>
        {node.icon ? <img alt="" src={icons[`../assets/system-map/${node.icon}.svg`]} /> : <svg viewBox="0 0 40 24" aria-hidden="true">{node.id === "inputs" ? <><rect x="2" y="3" width="36" height="18" rx="9" /><circle cx="12" cy="12" r="6" /></> : <><circle cx="20" cy="12" r="10" /><circle cx="20" cy="12" r="5" /></>}</svg>}
        <strong>{node.label}</strong><span>{node.subtitle}</span>
      </button>)}
    </div>
    {selected && <NodeDetails node={selected} links={links} nodes={nodes} close={() => { setSelected(null); trigger.current?.focus(); }} />}
  </>;
}
