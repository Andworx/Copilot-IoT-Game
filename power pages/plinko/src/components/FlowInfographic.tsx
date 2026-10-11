import { useEffect, useState } from "react";
import { FLOW_STEP_MS, FLOW_STEPS, type FlowStep } from "../data/flowSteps";

const icons = import.meta.glob<string>("../assets/icons/*.svg", { eager: true, query: "?url", import: "default" });

function StepGlyph({ step }: { step: FlowStep }) {
  if (step.icon) return <img alt="" src={icons[`../assets/icons/${step.icon}.svg`]} />;
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      {step.id === "drop" && <><circle cx="20" cy="22" r="10" /><path d="M20 2v8M15 7l5 5 5-5" /></>}
      {step.id === "lights" && (
        <g className="bucket-glyph">
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} className="bucket" style={{ ["--i" as string]: i }}>
              <rect className={`bucket-light${i === 2 ? " rest" : ""}`} x={3.2 + i * 7.2} y="19" width="4.6" height="14" />
              <path d={`M${2.4 + i * 7.2} 12v21h6.2V12`} />
            </g>
          ))}
        </g>
      )}
      {step.id === "sensor" && (
        <>
          <rect x="3" y="12" width="9" height="16" rx="2" />
          <rect x="28" y="12" width="9" height="16" rx="2" />
          <circle cx="7.5" cy="20" r="2" className="lit" />
          <circle cx="32.5" cy="20" r="2" />
          <path d="M16 20h8" className="beam" />
        </>
      )}
      {step.id === "phone" && <><rect x="12" y="4" width="16" height="32" rx="3" /><rect x="16" y="11" width="8" height="8" /></>}
    </svg>
  );
}

/**
 * Idle attract screen: the system's step-by-step path for one drop, with a light
 * travelling through the steps in the order they happen. Pure animation -- it shows
 * no live LED state (the Pi owns the chase lights; see PLINKO_GAME_PLAN.md §3).
 */
export function FlowInfographic() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setInterval(() => setActive((i) => (i + 1) % FLOW_STEPS.length), reduceMotion ? FLOW_STEP_MS * 2 : FLOW_STEP_MS);
    return () => clearInterval(id);
  }, []);

  const step = FLOW_STEPS[active];

  return (
    <section className="flow" aria-label="How Plinko works">
      <header className="flow-header">
        <span className="eyebrow">Copilot Plinko</span>
        <h1>Drop a puck. Hit the lit bucket for bonus entries.</h1>
      </header>

      <div className="flow-track" data-wrap={active === 0} style={{ ["--index" as string]: active, ["--count" as string]: FLOW_STEPS.length }}>
        <div className="flow-line" aria-hidden="true" />
        <div className="flow-light" aria-hidden="true" />
        <ol className="flow-steps">
          {FLOW_STEPS.map((s, i) => (
            <li key={s.id} className={`flow-step ${s.tier}`} data-state={i === active ? "active" : i < active ? "done" : "next"}>
              <span className="flow-icon"><StepGlyph step={s} /></span>
              <strong>{s.label}</strong>
            </li>
          ))}
        </ol>
      </div>

      <div className="flow-caption" aria-live="polite">
        <span className={`tier-tag ${step.tier}`}>{step.tier === "edge" ? "Edge" : step.tier === "cloud" ? "Azure" : "Power Platform"}</span>
        <span className="flow-count">Step {active + 1} of {FLOW_STEPS.length}</span>
        <h2>{step.label}</h2>
        <p>{step.caption}</p>
      </div>
    </section>
  );
}
