import { useEffect, useMemo, useState } from "react";
import type { JsonSchemaProperty, ToolDef } from "@mcpquest/types";

interface Props {
  tools: ToolDef[];
  disabled: boolean;
  running: boolean;
  callsUsed: number;
  parCalls: number;
  maxCalls: number;
  onRun: (tool: string, args: Record<string, unknown>) => void;
}

type FormValues = Record<string, string>;

function fieldLabel(name: string): string {
  return name.replace(/_/g, " ");
}

function buildArgs(tool: ToolDef, values: FormValues): { args: Record<string, unknown>; error?: string } {
  const args: Record<string, unknown> = {};
  const required = new Set(tool.inputSchema.required ?? []);
  for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
    const raw = (values[name] ?? "").trim();
    if (!raw) {
      if (required.has(name)) return { args, error: `${fieldLabel(name)} is required.` };
      continue;
    }
    if (schema.type === "integer" || schema.type === "number") {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || (schema.type === "integer" && !Number.isInteger(parsed))) {
        return { args, error: `${fieldLabel(name)} must be a ${schema.type === "integer" ? "whole " : ""}number.` };
      }
      if (schema.minimum !== undefined && parsed < schema.minimum) {
        return { args, error: `${fieldLabel(name)} must be at least ${schema.minimum}.` };
      }
      if (schema.maximum !== undefined && parsed > schema.maximum) {
        return { args, error: `${fieldLabel(name)} must be at most ${schema.maximum}.` };
      }
      args[name] = parsed;
    } else if (schema.type === "boolean") {
      args[name] = raw === "true";
    } else {
      args[name] = raw;
    }
  }
  return { args };
}

function Field({
  name,
  schema,
  required,
  value,
  disabled,
  onChange,
}: {
  name: string;
  schema: JsonSchemaProperty;
  required: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = `field-${name}`;
  const isNumber = schema.type === "integer" || schema.type === "number";
  return (
    <div className="field">
      <label htmlFor={id}>
        {fieldLabel(name)}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {schema.enum || schema.type === "boolean" ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
          <option value="">{required ? "Choose…" : "(any)"}</option>
          {(schema.enum ?? ["true", "false"]).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoComplete="off"
          inputMode={isNumber ? "numeric" : "text"}
          placeholder={schema.default !== undefined ? `default ${String(schema.default)}` : undefined}
        />
      )}
      {schema.description ? <p className="field-help">{schema.description}</p> : null}
    </div>
  );
}

export function ToolWorkbench({ tools, disabled, running, callsUsed, parCalls, maxCalls, onRun }: Props) {
  const [selectedName, setSelectedName] = useState(tools[0]?.name ?? "");
  const [valuesByTool, setValuesByTool] = useState<Record<string, FormValues>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const selected = useMemo(() => tools.find((t) => t.name === selectedName) ?? tools[0], [tools, selectedName]);

  useEffect(() => {
    setFormError(null);
  }, [selectedName]);

  if (!selected) return null;
  const values = valuesByTool[selected.name] ?? {};
  const required = new Set(selected.inputSchema.required ?? []);
  const fields = Object.entries(selected.inputSchema.properties);
  const overPar = callsUsed >= parCalls;

  return (
    <section className="card workbench" aria-labelledby="tools-title">
      <div className="card-head">
        <h2 id="tools-title">Tools</h2>
        <p className={`calls ${overPar ? "calls-over" : ""}`} aria-live="polite">
          {callsUsed} / {maxCalls} calls · {overPar ? "extra calls cost points" : `${Math.max(0, parCalls - callsUsed)} free left`}
        </p>
      </div>

      <div className="tool-tabs" role="tablist" aria-label="Available tools">
        {tools.map((tool) => (
          <button
            key={tool.name}
            role="tab"
            type="button"
            aria-selected={tool.name === selected.name}
            className={tool.name === selected.name ? "tab active" : "tab"}
            onClick={() => setSelectedName(tool.name)}
          >
            {tool.name}
          </button>
        ))}
      </div>

      <form
        className="tool-form"
        onSubmit={(event) => {
          event.preventDefault();
          const { args, error } = buildArgs(selected, values);
          if (error) {
            setFormError(error);
            return;
          }
          setFormError(null);
          onRun(selected.name, args);
        }}
      >
        <p className="tool-desc">{selected.description}</p>
        {fields.length === 0 ? <p className="muted">No inputs. Just run it.</p> : null}
        <div className="fields">
          {fields.map(([name, schema]) => (
            <Field
              key={name}
              name={name}
              schema={schema}
              required={required.has(name)}
              value={values[name] ?? ""}
              disabled={disabled}
              onChange={(value) =>
                setValuesByTool((prev) => ({
                  ...prev,
                  [selected.name]: { ...(prev[selected.name] ?? {}), [name]: value },
                }))
              }
            />
          ))}
        </div>
        {formError ? (
          <p className="error" role="alert">
            {formError}
          </p>
        ) : null}
        <button type="submit" className="primary" disabled={disabled || running}>
          {running ? "Running…" : `Run ${selected.name}`}
        </button>
      </form>
    </section>
  );
}
