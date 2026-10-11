import { useEffect, useRef, useState } from "react";

type Where = "you" | "function" | "model" | "engine";

interface Stage {
  id: string;
  phase: "build" | "play";
  title: string;
  short: string;
  where: Where;
  detail: string;
  guard?: string;
}

const WHERE_LABEL: Record<Where, string> = {
  you: "Runs in your browser",
  function: "Runs in the game's Azure Function",
  model: "Runs in Azure AI Foundry",
  engine: "Runs in the prize engine",
};

const STAGES: Stage[] = [
  {
    id: "pick",
    phase: "build",
    title: "Pick a system",
    short: "You choose a system from MCP Station",
    where: "you",
    detail:
      "The list comes from MCP Station, the only catalog the game uses. A system is a set of tools an agent could call, such as looking up a record or sending a message.",
  },
  {
    id: "read",
    phase: "build",
    title: "Read its tools",
    short: "The Function reads the tool list and a few sample records",
    where: "function",
    detail:
      "The Function fetches the system's tool list and a handful of sample records so the mission can use real names and values. This is the only time the game talks to the system, and it only reads.",
    guard: "Read-only. Nothing on the system is created, changed or deleted.",
  },
  {
    id: "write",
    phase: "build",
    title: "A model writes the mission",
    short: "A Foundry language model drafts a structured mission",
    where: "model",
    detail:
      "A language model hosted in Azure AI Foundry turns the tool list into a mission: a story, a few cases, and what a correct Power Platform solution must do. It answers in a fixed structure, not free text.",
    guard: "The model only writes the mission. It never scores a play or touches prizes.",
  },
  {
    id: "prove",
    phase: "build",
    title: "Prove it can be solved",
    short: "The mission is checked before anyone plays it",
    where: "function",
    detail:
      "The Function checks the mission is well formed, then tests it: a correct reference answer must pass, a deliberately flawed one must fail, doing nothing must fail, and every value a player needs must be findable. If a check fails the model gets one chance to repair it.",
    guard: "A mission that cannot be proven is never shown to players.",
  },
  {
    id: "save",
    phase: "build",
    title: "Save it for everyone",
    short: "The mission is stored against the tool list",
    where: "function",
    detail:
      "The proven mission is saved keyed to the system's tool list. Anyone who picks the same system gets the same mission without waiting for a model, until the tool list changes.",
  },
  {
    id: "design",
    phase: "play",
    title: "You build the fix",
    short: "You design the solution with Power Platform pieces",
    where: "you",
    detail:
      "You assemble a flow, app, site, agent, report or table from the designers, using the tools and sample values the mission gives you. The clock runs while you work.",
  },
  {
    id: "judge",
    phase: "play",
    title: "A fixed judge scores it",
    short: "Plain rules score your design out of 100",
    where: "function",
    detail:
      "When you submit, fixed server-side rules replay your design against the saved tool list and score it out of 100. There is no AI in the scoring, so the same design always earns the same score.",
    guard: "Your design runs against the saved tool list, never the real system.",
  },
  {
    id: "prize",
    phase: "play",
    title: "Score becomes entries",
    short: "Your score sets your grand-prize entries",
    where: "engine",
    detail:
      "90 to 100 earns the most entries the campaign allows, 70 to 89 earns one fewer, and under 70 earns one. The prize engine caps the total across every game, then gives you a QR code that opens the Prize Wheel.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

/** The "How is this made?" dialog: a clickable map of how a generated mission is built, played and scored. */
export function HowItsMade({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string>(STAGES[0].id);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const stage = STAGES.find((s) => s.id === selected) ?? STAGES[0];
  const phases: Array<{ key: Stage["phase"]; title: string; note: string }> = [
    { key: "build", title: "Before you play", note: "Done once per system, then reused." },
    { key: "play", title: "While you play", note: "Every run." },
  ];

  return (
    <dialog
      ref={dialogRef}
      className="how-dialog"
      aria-labelledby="how-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="how-body">
        <div className="how-head">
          <div>
            <p className="eyebrow">Behind the mission</p>
            <h2 id="how-title">How is this made?</h2>
          </div>
          <button type="button" className="how-close" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted how-note">
          Choose a step to see what happens there. The game keeps running while this is open.
        </p>

        <div className="how-layout">
          <div className="how-map">
            {phases.map((phase) => (
              <section key={phase.key} aria-label={phase.title}>
                <h3>
                  {phase.title} <span className="muted">· {phase.note}</span>
                </h3>
                <ol className="how-steps">
                  {STAGES.filter((s) => s.phase === phase.key).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={`how-step how-${s.where}`}
                        aria-pressed={s.id === selected}
                        aria-describedby={`how-short-${s.id}`}
                        onClick={() => setSelected(s.id)}
                      >
                        <span className="how-step-title">{s.title}</span>
                        <span id={`how-short-${s.id}`} className="how-step-short">
                          {s.short}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>

          <aside className="how-detail" aria-live="polite">
            <p className={`how-where how-${stage.where}`}>{WHERE_LABEL[stage.where]}</p>
            <h3>{stage.title}</h3>
            <p>{stage.detail}</p>
            {stage.guard ? <p className="how-guard">{stage.guard}</p> : null}
          </aside>
        </div>

        <ul className="how-legend" aria-label="Where each step runs">
          {(Object.keys(WHERE_LABEL) as Where[]).map((w) => (
            <li key={w} className={`how-${w}`}>
              {WHERE_LABEL[w]}
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}
