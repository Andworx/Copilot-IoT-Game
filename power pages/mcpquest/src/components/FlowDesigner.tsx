import { useState } from "react";
import {
  RECURRENCE_OPTIONS,
  STEP_DEFS,
  TRIGGERS,
  newStep,
  stepDef,
  type FlowDesign,
  type FlowStep,
  type StepKind,
} from "@mcpquest/designs";
import type { DesignCatalog } from "@mcpquest/types";

interface Props {
  design: FlowDesign;
  catalog: DesignCatalog;
  disabled: boolean;
  onChange: (design: FlowDesign) => void;
}

const GROUPS = ["IT Ticketing (MCP)", "Control", "Approvals", "Notifications"] as const;

/** A small Power Automate-style cloud flow designer: one trigger, then ordered steps. */
export function FlowDesigner({ design, catalog, disabled, onChange }: Props) {
  const [adding, setAdding] = useState(false);

  const setStep = (id: string, patch: (s: FlowStep) => FlowStep) =>
    onChange({ ...design, steps: design.steps.map((s) => (s.id === id ? patch(s) : s)) });

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= design.steps.length) return;
    const steps = [...design.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    onChange({ ...design, steps });
  };

  let underCondition = false;

  return (
    <div className="flow" aria-label="Flow designer">
      <div className="flow-card flow-trigger">
        <p className="flow-kicker">Trigger</p>
        <label htmlFor="flow-trigger">How does this flow start?</label>
        <select
          id="flow-trigger"
          value={design.trigger}
          disabled={disabled}
          onChange={(e) =>
            onChange({ ...design, trigger: e.target.value as FlowDesign["trigger"], triggerParams: {} })
          }
        >
          {TRIGGERS.map((t) => (
            <option key={t.kind} value={t.kind}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="field-help">{TRIGGERS.find((t) => t.kind === design.trigger)?.description}</p>

        {design.trigger === "recurrence" ? (
          <>
            <label htmlFor="flow-frequency">Frequency</label>
            <select
              id="flow-frequency"
              value={design.triggerParams.frequency ?? ""}
              disabled={disabled}
              onChange={(e) => onChange({ ...design, triggerParams: { frequency: e.target.value } })}
            >
              <option value="">Choose…</option>
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {design.steps.map((step, index) => {
        const def = stepDef(step.kind);
        if (step.kind === "condition") underCondition = true;
        const indented = underCondition && step.kind !== "condition";
        return (
          <div key={step.id} className={indented ? "flow-card flow-step flow-indent" : "flow-card flow-step"}>
            <div className="flow-step-head">
              <div>
                <p className="flow-kicker">{def.group}</p>
                <h4>{def.label}</h4>
              </div>
              <div className="flow-actions">
                <button type="button" aria-label={`Move ${def.label} up`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${def.label} down`}
                  disabled={disabled || index === design.steps.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${def.label}`}
                  disabled={disabled}
                  onClick={() => onChange({ ...design, steps: design.steps.filter((s) => s.id !== step.id) })}
                >
                  ✕
                </button>
              </div>
            </div>

            {def.params.length === 0 ? <p className="field-help">{def.description}</p> : null}
            <div className="flow-params">
              {def.params.map((param) => {
                const options = param.options(step.params, catalog);
                const id = `${step.id}-${param.name}`;
                return (
                  <div key={param.name} className="field">
                    <label htmlFor={id}>{param.label}</label>
                    <select
                      id={id}
                      value={step.params[param.name] ?? ""}
                      disabled={disabled}
                      onChange={(e) =>
                        setStep(step.id, (s) => {
                          const params = { ...s.params, [param.name]: e.target.value };
                          // Changing a field invalidates the value that depended on it.
                          if (param.name === "field" || param.name === "property") delete params.value;
                          return { ...s, params };
                        })
                      }
                    >
                      <option value="">{options.some((o) => o.value === "") ? "" : "Choose…"}</option>
                      {options
                        .filter((o) => o.value !== "" || o.label !== "")
                        .map((o) => (
                          <option key={`${o.value}-${o.label}`} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {adding ? (
        <div className="flow-card flow-palette">
          <div className="flow-step-head">
            <h4>Add an action</h4>
            <button type="button" aria-label="Close the action list" onClick={() => setAdding(false)}>
              ✕
            </button>
          </div>
          {GROUPS.map((group) => (
            <div key={group} className="palette-group">
              <p className="flow-kicker">{group}</p>
              <div className="palette-items">
                {STEP_DEFS.filter((d) => d.group === group).map((d) => (
                  <button
                    key={d.kind}
                    type="button"
                    className="palette-item"
                    disabled={disabled}
                    onClick={() => {
                      onChange({ ...design, steps: [...design.steps, newStep(d.kind as StepKind)] });
                      setAdding(false);
                    }}
                  >
                    <strong>{d.label}</strong>
                    <span>{d.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <button type="button" className="add-step" disabled={disabled} onClick={() => setAdding(true)}>
          + New step
        </button>
      )}
    </div>
  );
}
