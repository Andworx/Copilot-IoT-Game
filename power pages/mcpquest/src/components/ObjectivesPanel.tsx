import type { Objective } from "@mcpquest/types";

interface Props {
  scenario: string;
  objectives: Objective[];
  answers: Record<string, string>;
  hints: Record<string, string>;
  hintPenalty: number;
  disabled: boolean;
  hintBusyId: string | null;
  onAnswer: (id: string, value: string) => void;
  onHint: (id: string) => void;
}

export function ObjectivesPanel({
  scenario,
  objectives,
  answers,
  hints,
  hintPenalty,
  disabled,
  hintBusyId,
  onAnswer,
  onHint,
}: Props) {
  return (
    <section className="card objectives" aria-labelledby="objectives-title">
      <h2 id="objectives-title">Mission</h2>
      <p className="scenario">{scenario}</p>
      <ol className="objective-list">
        {objectives.map((objective, index) => {
          const hint = hints[objective.id];
          const heading =
            objective.caseTitle && objective.caseTitle !== objectives[index - 1]?.caseTitle
              ? objective.caseTitle
              : null;
          return (
            <li key={objective.id} className="objective">
              {heading ? <h3 className="case-title">{heading}</h3> : null}

              <label htmlFor={`answer-${objective.id}`} className="objective-prompt">
                <span className="objective-num">{index + 1}</span>
                {objective.prompt}
              </label>
              <input
                id={`answer-${objective.id}`}
                value={answers[objective.id] ?? ""}
                onChange={(event) => onAnswer(objective.id, event.target.value)}
                disabled={disabled}
                autoComplete="off"
                inputMode={objective.kind === "number" ? "numeric" : "text"}
                placeholder={objective.answerFormat}
              />

              {hint ? (
                <p className="hint" role="note">
                  <strong>Hint:</strong> {hint}
                </p>
              ) : (
                <button
                  type="button"
                  className="link"
                  disabled={disabled || hintBusyId === objective.id}
                  onClick={() => onHint(objective.id)}
                >
                  Need a hint? (−{hintPenalty} points)
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
