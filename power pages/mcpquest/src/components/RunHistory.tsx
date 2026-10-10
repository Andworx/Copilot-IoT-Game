import type { RunTrace, StepTrace } from "@mcpquest/types";

interface Props {
  runs: RunTrace[];
}

const STATUS_LABEL: Record<StepTrace["status"], string> = {
  succeeded: "Succeeded",
  skipped: "Skipped",
  failed: "Failed",
  "not-run": "Not run",
};

const STATUS_ICON: Record<StepTrace["status"], string> = {
  succeeded: "✓",
  skipped: "–",
  failed: "✗",
  "not-run": "·",
};

function pretty(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

/** Mirrors Power Automate's run history: every step with its status and its inputs/outputs. */
export function RunHistory({ runs }: Props) {
  return (
    <div className="runs">
      {runs.map((run) => (
        <section key={run.scenario} className="run" aria-label={`Test run: ${run.scenario}`}>
          <h4>
            {run.scenario}
            <span className={run.fired ? "pill" : "pill pill-bad"}>{run.fired ? "Ran" : "Did not run"}</span>
          </h4>
          {run.steps.length === 0 && run.fired ? <p className="muted">The flow started and had no steps.</p> : null}
          <ol className="run-steps">
            {run.steps.map((step, index) => (
              <li key={index} className={`run-step run-${step.status}`}>
                <span className="run-icon" aria-hidden="true">
                  {STATUS_ICON[step.status]}
                </span>
                <div>
                  <p className="run-label">
                    {step.label} <span className="visually-hidden">{STATUS_LABEL[step.status]}</span>
                    {step.mcp ? <code className="mcp-tag">MCP {step.mcp.tool}</code> : null}
                  </p>
                  <p className="muted">{step.detail}</p>
                  {step.mcp ? (
                    <details className="run-io">
                      <summary>Inputs and outputs</summary>
                      <p className="flow-kicker">Inputs</p>
                      <pre className="raw">{JSON.stringify(step.mcp.args, null, 2)}</pre>
                      <p className="flow-kicker">Outputs</p>
                      <pre className="raw">{pretty(step.mcp.text)}</pre>
                    </details>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
