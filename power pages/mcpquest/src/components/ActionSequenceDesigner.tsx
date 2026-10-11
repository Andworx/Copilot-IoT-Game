import { useState } from "react";
import {
  MAX_ACTION_STEPS,
  PRODUCT_FOR_DESIGNER,
  coerceArg,
  nextStepId,
  template,
  templateKey,
  triggerLabel,
  type ActionDesign,
  type ActionStep,
  type ArgValue,
} from "@mcpquest/specDesigns";
import type { DesignerKind, JsonSchemaProperty, ToolDef } from "@mcpquest/types";

interface Props {
  designer: DesignerKind;
  design: ActionDesign;
  tools: ToolDef[];
  /** What can start the case, from its scenarios. */
  triggers: string[];
  /** Facts the scenarios supply, which a step can use instead of a typed value. */
  scenarioKeys: string[];
  disabled: boolean;
  onChange: (design: ActionDesign) => void;
}

const LITERAL = "__literal__";

const START_HELP: Record<DesignerKind, string> = {
  flow: "How does this flow start?",
  app: "When does this app run?",
  site: "When does this site run?",
  agent: "When does this agent act?",
  report: "",
  table: "",
  security: "",
};

const STEPS_KICKER: Record<DesignerKind, string> = {
  flow: "Actions",
  app: "What the app does",
  site: "What the site does",
  agent: "What the agent does",
  report: "",
  table: "",
  security: "",
};

/**
 * One designer for every case the judge runs (flow, app, site, agent): a start, then an ordered
 * list of calls to the MCP server's tools with their arguments. It writes the run-design format
 * `{ trigger, steps: [{ id, tool, args }] }`. The judge decides what the calls add up to.
 */
export function ActionSequenceDesigner({ designer, design, tools, triggers, scenarioKeys, disabled, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const noun = PRODUCT_FOR_DESIGNER[designer].noun;
  const triggerOptions = triggers.includes(design.trigger) || design.trigger === "" ? triggers : [...triggers, design.trigger];

  const setStep = (id: string, patch: (s: ActionStep) => ActionStep) =>
    onChange({ ...design, steps: design.steps.map((s) => (s.id === id ? patch(s) : s)) });

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= design.steps.length) return;
    const steps = [...design.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    onChange({ ...design, steps });
  };

  const setArg = (stepId: string, name: string, value: ArgValue | undefined) =>
    setStep(stepId, (s) => {
      const args = { ...s.args };
      if (value === undefined) delete args[name];
      else args[name] = value;
      return { ...s, args };
    });

  return (
    <div className="flow" aria-label={`${noun} designer`}>
      <div className="flow-card flow-trigger">
        <p className="flow-kicker">Start</p>
        <label htmlFor="seq-trigger">{START_HELP[designer]}</label>
        <select
          id="seq-trigger"
          value={design.trigger}
          disabled={disabled}
          onChange={(e) => onChange({ ...design, trigger: e.target.value })}
        >
          {triggerOptions.map((t) => (
            <option key={t} value={t}>
              {triggerLabel(designer, t)}
            </option>
          ))}
        </select>
      </div>

      {design.steps.map((step, index) => {
        const tool = tools.find((t) => t.name === step.tool);
        return (
          <div key={step.id} className="flow-card flow-step">
            <div className="flow-step-head">
              <div>
                <p className="flow-kicker">
                  {STEPS_KICKER[designer]} · step {index + 1}
                </p>
                <label className="visually-hidden" htmlFor={`${step.id}-tool`}>
                  Tool for step {index + 1}
                </label>
                <select
                  id={`${step.id}-tool`}
                  value={step.tool}
                  disabled={disabled}
                  onChange={(e) => setStep(step.id, (s) => ({ ...s, tool: e.target.value, args: {} }))}
                >
                  {!tool ? <option value={step.tool}>{step.tool}</option> : null}
                  {tools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flow-actions">
                <button type="button" aria-label={`Move step ${index + 1} up`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move step ${index + 1} down`}
                  disabled={disabled || index === design.steps.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`Remove step ${index + 1}`}
                  disabled={disabled}
                  onClick={() => onChange({ ...design, steps: design.steps.filter((s) => s.id !== step.id) })}
                >
                  ✕
                </button>
              </div>
            </div>

            {tool ? <p className="field-help">{tool.description.replace(/^\[[^\]]*\]\s*/, "")}</p> : null}

            {tool ? (
              <ToolArgs
                step={step}
                tool={tool}
                scenarioKeys={scenarioKeys}
                disabled={disabled}
                onArg={(name, value) => setArg(step.id, name, value)}
              />
            ) : null}
          </div>
        );
      })}

      {adding ? (
        <div className="flow-card flow-palette">
          <div className="flow-step-head">
            <h4>Choose a tool</h4>
            <button type="button" aria-label="Close the tool list" onClick={() => setAdding(false)}>
              ✕
            </button>
          </div>
          <div className="palette-items">
            {tools.map((t) => (
              <button
                key={t.name}
                type="button"
                className="palette-item"
                disabled={disabled}
                onClick={() => {
                  onChange({ ...design, steps: [...design.steps, { id: nextStepId(design.steps), tool: t.name, args: {} }] });
                  setAdding(false);
                }}
              >
                <strong>{t.name}</strong>
                <span>{t.description.replace(/^\[[^\]]*\]\s*/, "")}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="add-step"
          disabled={disabled || design.steps.length >= MAX_ACTION_STEPS}
          onClick={() => setAdding(true)}
        >
          + New step
        </button>
      )}
    </div>
  );
}

interface ToolArgsProps {
  step: ActionStep;
  tool: ToolDef;
  scenarioKeys: string[];
  disabled: boolean;
  onArg: (name: string, value: ArgValue | undefined) => void;
}

/**
 * A step's arguments. Required ones are always shown; optional ones sit in a collapsible so a
 * tool with many filters does not bury the few that matter. Which group an argument is in
 * depends only on the tool, never on its value, so a field does not jump while it is typed in.
 */
function ToolArgs({ step, tool, scenarioKeys, disabled, onArg }: ToolArgsProps) {
  const required = new Set(tool.inputSchema.required ?? []);
  const entries = Object.entries(tool.inputSchema.properties);
  const must = entries.filter(([name]) => required.has(name));
  const may = entries.filter(([name]) => !required.has(name));
  const setCount = may.filter(([name]) => step.args[name] !== undefined).length;
  // Fixed when the step appears, so clearing a value never closes the panel under the player.
  const [startOpen] = useState(() => must.length === 0 || setCount > 0);

  const field = ([name, prop]: [string, JsonSchemaProperty]) => (
    <ArgField
      key={name}
      id={`${step.id}-${name}`}
      name={name}
      prop={prop}
      required={required.has(name)}
      value={step.args[name]}
      scenarioKeys={scenarioKeys}
      disabled={disabled}
      onChange={(v) => onArg(name, v)}
    />
  );

  return (
    <>
      {must.length > 0 ? <div className="flow-params">{must.map(field)}</div> : null}
      {may.length > 0 ? (
        <details className="more-args" open={startOpen}>
          <summary>
            Optional settings ({may.length}
            {setCount > 0 ? `, ${setCount} set` : ""})
          </summary>
          <div className="flow-params">{may.map(field)}</div>
        </details>
      ) : null}
    </>
  );
}

interface ArgFieldProps {
  id: string;
  name: string;
  prop: JsonSchemaProperty;
  required: boolean;
  value: ArgValue | undefined;
  scenarioKeys: string[];
  disabled: boolean;
  onChange: (value: ArgValue | undefined) => void;
}

/** One argument: a typed value, or "the scenario's value" for a fact the case supplies. */
function ArgField({ id, name, prop, required, value, scenarioKeys, disabled, onChange }: ArgFieldProps) {
  const key = templateKey(value);
  const source = key ?? LITERAL;
  const label = `${name}${required ? " *" : ""}`;
  const literal = key ? "" : value === undefined ? "" : String(value);

  const input = (() => {
    if (prop.enum) {
      return (
        <select id={id} value={literal} disabled={disabled} onChange={(e) => onChange(coerceArg(prop, e.target.value))}>
          <option value="">Choose…</option>
          {prop.enum.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    if (prop.type === "boolean") {
      return (
        <select id={id} value={literal} disabled={disabled} onChange={(e) => onChange(coerceArg(prop, e.target.value))}>
          <option value="">Choose…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    return (
      <input
        id={id}
        type={prop.type === "integer" || prop.type === "number" ? "number" : "text"}
        value={literal}
        disabled={disabled}
        placeholder={prop.description ?? ""}
        onChange={(e) => onChange(coerceArg(prop, e.target.value))}
      />
    );
  })();

  return (
    <div className="field arg-field">
      <label htmlFor={id}>{label}</label>
      {prop.description ? <p className="field-help">{prop.description}</p> : null}
      {scenarioKeys.length > 0 ? (
        <select
          aria-label={`Where ${name} comes from`}
          value={source}
          disabled={disabled}
          onChange={(e) => (e.target.value === LITERAL ? onChange(undefined) : onChange(template(e.target.value)))}
        >
          <option value={LITERAL}>A value I type</option>
          {scenarioKeys.map((k) => (
            <option key={k} value={k}>
              The scenario's {k}
            </option>
          ))}
        </select>
      ) : null}
      {key ? <p className="field-help">Uses the {key} of whichever situation is being tested.</p> : input}
    </div>
  );
}
