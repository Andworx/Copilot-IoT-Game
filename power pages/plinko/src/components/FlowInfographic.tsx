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
 * How-it-works guide: the system's step-by-step path for one drop, with a light
 * travelling through the steps in the order they happen. Shown from the gear (GuideDialog);
 * the live chase light is ChaseBoard, and the board itself has no LEDs.
 */
export function FlowInfographic() {
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setInterval(() => setActive((i) => (i < 0 || i >= FLOW_STEPS.length - 1 ? 0 : i + 1)), reduceMotion ? FLOW_STEP_MS * 2 : FLOW_STEP_MS);
    return () => clearInterval(id);
  }, [playing]);

  const isActive = active >= 0;
  const currentIndex = isActive ? active : 0;
  const step = FLOW_STEPS[currentIndex];
  const start = () => {
    setActive(0);
    setPlaying(false);
  };
  const previous = () => setActive((i) => Math.max(0, i - 1));
  const next = () => setActive((i) => (i < 0 ? 0 : Math.min(FLOW_STEPS.length - 1, i + 1)));
  const exit = () => {
    setActive(-1);
    setPlaying(false);
  };
  const togglePlaying = () => {
    setActive((i) => (i < 0 ? 0 : i));
    setPlaying((p) => !p);
  };

  return (
    <section className="flow" aria-label="How Plinko works">
      <header className="flow-header">
        <div>
          <h2>Plinko solution map</h2>
          <p>Walk one drop from the physical board to Azure, Dataverse, this booth display and the player phone.</p>
        </div>
      </header>

      <div className="flow-track" data-wrap={playing && currentIndex === 0} style={{ ["--index" as string]: currentIndex, ["--count" as string]: FLOW_STEPS.length }}>
        <div className="flow-line" aria-hidden="true" />
        {isActive && <div className="flow-light" aria-hidden="true" />}
        <ol className="flow-steps">
          {FLOW_STEPS.map((s, i) => (
            <li key={s.id} className={`flow-step ${s.tier}`} data-state={!isActive ? "next" : i === active ? "active" : i < active ? "done" : "next"}>
              <button type="button" onClick={() => { setActive(i); setPlaying(false); }} aria-current={i === active ? "step" : undefined}>
                <span className="flow-icon"><StepGlyph step={s} /></span>
                <strong>{s.label}</strong>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className={isActive ? "flow-caption is-active" : "flow-caption"} aria-live="polite">
        {isActive ? (
          <>
            <span className={`tier-tag ${step.tier}`}>{step.tier === "edge" ? "Edge" : step.tier === "cloud" ? "Azure" : "Power Platform"}</span>
            <span className="flow-count">Step {active + 1} of {FLOW_STEPS.length}</span>
            <h2>{step.label}</h2>
            <p>{step.caption}</p>
          </>
        ) : (
          <>
            <span className="tier-tag platform">Tour</span>
            <span className="flow-count">{FLOW_STEPS.length} connected steps</span>
            <h2>Follow the live drop path</h2>
            <p>Start the walkthrough, use the step buttons, or tap any node in the diagram to focus that part of the solution.</p>
          </>
        )}
        <div className="flow-controls">
          {!isActive ? (
            <button type="button" onClick={start}>Start walkthrough</button>
          ) : (
            <>
              <button type="button" onClick={previous} disabled={active === 0}>Previous</button>
              <button type="button" onClick={next} disabled={active === FLOW_STEPS.length - 1}>Next</button>
              <button type="button" aria-pressed={playing} onClick={togglePlaying}>{playing ? "Pause" : "Auto-play"}</button>
              <button type="button" onClick={exit}>Exit</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
