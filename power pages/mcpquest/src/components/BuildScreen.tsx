import { useEffect, useMemo, useState } from "react";
import type { BuildStage } from "@mcpquest/types";

/**
 * The wait while a mission is built (about 25 seconds), told as a short scene: an old sage by a
 * fire in a cave hands over the Platform. The six products arrive one at a time as the build
 * really reaches each stage, so the scene doubles as honest progress. All art, wording and
 * behaviour are original to this game.
 */

interface Props {
  serverName: string;
  /** The stage the build has reached, or null before it has reported one. */
  stage: BuildStage | null;
  /** Set when the build finished: the mission is ready to begin. */
  title: string | null;
  error: string | null;
  starting: boolean;
  onBegin: () => void;
  onBack: () => void;
  onRetry: () => void;
}

const ORDER: Record<BuildStage, number> = {
  reading: 0,
  designing: 1,
  repairing: 1,
  checking: 2,
  proving: 3,
  saving: 4,
  done: 5,
};

/** Each item lands when the build has moved past the stage it stands for. */
const ITEMS = [
  { id: "dataverse", name: "Dataverse", badge: "Dv", colour: "#7dd3fc", after: 1 },
  { id: "power-automate", name: "Power Automate", badge: "PA", colour: "#a78bfa", after: 2 },
  { id: "power-apps", name: "Power Apps", badge: "Ap", colour: "#86efac", after: 3 },
  { id: "copilot-studio", name: "Copilot Studio", badge: "Cs", colour: "#f9a8d4", after: 4 },
  { id: "power-bi", name: "Power BI", badge: "BI", colour: "#fcd34d", after: 5 },
  { id: "power-pages", name: "Power Pages", badge: "Pg", colour: "#5eead4", after: 5 },
] as const;

const LINES: Record<BuildStage, string> = {
  reading: "Hm. A new place. Let me see what lives in here…",
  designing: "Dangerous to go alone. I am putting a mission together for you.",
  repairing: "No, no, that will not do. Let me think it through again.",
  checking: "Checking my work. A sage is never careless.",
  proving: "Making sure it can really be solved…",
  saving: "Nearly ready. Take this.",
  done: "It is dangerous to go alone. Take the Platform.",
};

/** A 16 by 16 pixel sage. H hood, F face, E eyes, B beard, R robe, S staff. */
const SAGE = [
  "................",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "...HHHFFFFHHH...",
  "...HHFEFFEFHH...",
  "...HHFFFFFFHH...",
  "...HHBBBBBBHH...",
  "..HRBBBBBBBBRH..",
  "..RRBBBBBBBBRR.S",
  "..RRRBBBBBBRRR.S",
  "..RRRRBBBBRRRR.S",
  "..RRRRRRRRRRRR.S",
  "..RRRRRRRRRRRR.S",
  "..RRRRRRRRRRRR.S",
  "...RRRRRRRRRR..S",
  "................",
];

const SAGE_COLOURS: Record<string, string> = {
  H: "#6d5bd0",
  F: "#e9c8a2",
  E: "#1b1530",
  B: "#f1f5f9",
  R: "#4c3fa8",
  S: "#a16207",
};

function useTypewriter(text: string): string {
  const [shown, setShown] = useState("");
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 24);
    return () => window.clearInterval(id);
  }, [text]);
  return shown;
}

function Sage() {
  const rects = useMemo(
    () =>
      SAGE.flatMap((row, y) =>
        [...row].flatMap((c, x) => (SAGE_COLOURS[c] ? [<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={SAGE_COLOURS[c]} />] : [])),
      ),
    [],
  );
  return (
    <svg className="cave-sage" viewBox="0 0 16 16" role="img" aria-label="An old sage" shapeRendering="crispEdges">
      {rects}
    </svg>
  );
}

function Fire() {
  // Two frames of flame, swapped by CSS so it flickers without any script.
  return (
    <svg className="cave-fire" viewBox="0 0 8 8" aria-hidden="true" shapeRendering="crispEdges">
      <g className="flame flame-a">
        <rect x="3" y="1" width="2" height="1" fill="#fde68a" />
        <rect x="2" y="2" width="4" height="2" fill="#fbbf24" />
        <rect x="1" y="4" width="6" height="2" fill="#f97316" />
      </g>
      <g className="flame flame-b">
        <rect x="3" y="2" width="2" height="1" fill="#fde68a" />
        <rect x="2" y="3" width="4" height="1" fill="#fbbf24" />
        <rect x="1" y="4" width="6" height="2" fill="#f97316" />
        <rect x="2" y="1" width="1" height="1" fill="#fbbf24" />
      </g>
      <rect x="1" y="6" width="6" height="1" fill="#78350f" />
      <rect x="0" y="7" width="8" height="1" fill="#451a03" />
    </svg>
  );
}

export function BuildScreen({ serverName, stage, title, error, starting, onBegin, onBack, onRetry }: Props) {
  const failed = error !== null;
  const done = !failed && stage === "done" && title !== null;
  const progress = stage ? ORDER[stage] : 0;
  const line = failed
    ? "The sage is out of ideas. Try another cave."
    : done
      ? `${LINES.done}`
      : LINES[stage ?? "reading"];
  const spoken = useTypewriter(line);

  return (
    <section className="card cave" aria-labelledby="cave-title" aria-busy={!done && !failed}>
      <h2 id="cave-title" className="visually-hidden">
        Building your mission
      </h2>

      <div className="cave-scene" aria-hidden="false">
        <div className="cave-roof" aria-hidden="true" />
        <div className="cave-floor">
          <Sage />
          <Fire />
        </div>
      </div>

      <div className="cave-dialogue" role="status" aria-live="polite">
        <p className="cave-speaker">Sage</p>
        <p className="cave-line">
          {spoken}
          <span className="cave-caret" aria-hidden="true" />
        </p>
        {/* Screen readers get the whole line at once rather than letter by letter. */}
        <span className="visually-hidden">{line}</span>
      </div>

      <ul className="cave-items" aria-label="What you are given">
        {ITEMS.map((item) => {
          const have = !failed && progress >= item.after && (item.after < 5 || done);
          return (
            <li key={item.id} className={have ? "cave-item is-have" : "cave-item"} style={{ ["--item" as string]: item.colour }}>
              <span className="cave-badge" aria-hidden="true">
                {item.badge}
              </span>
              <span className="cave-item-name">{item.name}</span>
              <span className="visually-hidden">{have ? " (received)" : " (not yet)"}</span>
            </li>
          );
        })}
      </ul>

      {failed ? (
        <div className="cave-actions">
          <p className="error" role="alert">
            {error}
          </p>
          <button type="button" className="primary" onClick={onRetry}>
            Try again
          </button>
          <button type="button" className="link" onClick={onBack}>
            Choose another system
          </button>
        </div>
      ) : done ? (
        <div className="cave-actions">
          <p className="cave-mission">
            <span className="muted">Your mission</span>
            <strong>{title}</strong>
            <span className="muted">built from {serverName}</span>
          </p>
          <button type="button" className="primary" disabled={starting} onClick={onBegin}>
            {starting ? "Starting…" : "Begin the mission"}
          </button>
        </div>
      ) : (
        <p className="muted cave-wait">
          Building a mission from {serverName}. This usually takes about half a minute.
        </p>
      )}
    </section>
  );
}
