import { useState } from "react";
import { APP_BUTTON_ACTIONS, CONTROL_DEFS, GALLERY_SOURCES, controlDef, newControl, type AppControl, type AppDesign } from "@mcpquest/designs";
import type { DesignCatalog } from "@mcpquest/types";

interface Props {
  design: AppDesign;
  catalog: DesignCatalog;
  disabled: boolean;
  onChange: (design: AppDesign) => void;
}

function Preview({ controls, catalog }: { controls: AppControl[]; catalog: DesignCatalog }) {
  if (controls.length === 0) return <p className="muted">Add controls to build the screen.</p>;
  return (
    <div className="phone" aria-label="App preview">
      <div className="phone-bar">Incident app</div>
      <div className="phone-body">
        {controls.map((c) => {
          if (c.kind === "text-input") {
            return (
              <div key={c.id} className="phone-field">
                <span>{c.params.field ? "Short description" : "Text input"}</span>
                <div className="phone-input" />
              </div>
            );
          }
          if (c.kind === "dropdown") {
            const options = c.params.field === "priority" ? catalog.priorities : c.params.field === "category" ? catalog.categories : [];
            return (
              <div key={c.id} className="phone-field">
                <span>{c.params.field === "priority" ? "Priority" : c.params.field === "category" ? "Category" : "Dropdown"}</span>
                <div className="phone-input phone-select">
                  {options[0] ?? "Choose…"} <small>▾ {options.length} choices</small>
                </div>
              </div>
            );
          }
          if (c.kind === "button") {
            const label = APP_BUTTON_ACTIONS.find((a) => a.value === c.params.onSelect)?.label ?? "Button";
            return (
              <button key={c.id} type="button" className="phone-button" tabIndex={-1}>
                {c.params.onSelect === "create-incident" ? "Submit" : c.params.onSelect === "resolve-selected" ? "Mark resolved" : "Button"}
                <small>{label}</small>
              </button>
            );
          }
          return (
            <div key={c.id} className="phone-gallery">
              <span>{GALLERY_SOURCES.find((s) => s.value === c.params.source)?.label ?? "Gallery"}</span>
              {["INC-000001", "INC-000002", "INC-000003"].map((id) => (
                <div key={id} className="phone-row">
                  {id} · sample row
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A small Power Apps canvas designer: place controls, set their properties, preview the screen. */
export function AppDesigner({ design, catalog, disabled, onChange }: Props) {
  const [adding, setAdding] = useState(false);

  const setControl = (id: string, patch: (c: AppControl) => AppControl) =>
    onChange({ controls: design.controls.map((c) => (c.id === id ? patch(c) : c)) });

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= design.controls.length) return;
    const controls = [...design.controls];
    [controls[index], controls[target]] = [controls[target], controls[index]];
    onChange({ controls });
  };

  return (
    <div className="app-designer" aria-label="App designer">
      <div className="app-tree">
        <p className="flow-kicker">Tree view · Screen1</p>

        {design.controls.length === 0 ? <p className="muted">The screen is empty.</p> : null}
        {design.controls.map((control, index) => {
          const def = controlDef(control.kind);
          return (
            <div key={control.id} className="flow-card flow-step">
              <div className="flow-step-head">
                <div>
                  <p className="flow-kicker">{def.label}</p>
                  <h4>
                    {def.label} {index + 1}
                  </h4>
                </div>
                <div className="flow-actions">
                  <button type="button" aria-label={`Move ${def.label} up`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${def.label} down`}
                    disabled={disabled || index === design.controls.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${def.label}`}
                    disabled={disabled}
                    onClick={() => onChange({ controls: design.controls.filter((c) => c.id !== control.id) })}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flow-params">
                {def.params.map((param) => {
                  const id = `${control.id}-${param.name}`;
                  const options = param.options(control.params, catalog);
                  return (
                    <div key={param.name} className="field">
                      <label htmlFor={id}>{param.label}</label>
                      <select
                        id={id}
                        value={control.params[param.name] ?? ""}
                        disabled={disabled}
                        onChange={(e) => setControl(control.id, (c) => ({ ...c, params: { ...c.params, [param.name]: e.target.value } }))}
                      >
                        <option value="">Choose…</option>
                        {options.map((o) => (
                          <option key={o.value} value={o.value}>
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
              <h4>Insert</h4>
              <button type="button" aria-label="Close the control list" onClick={() => setAdding(false)}>
                ✕
              </button>
            </div>
            <div className="palette-items">
              {CONTROL_DEFS.map((d) => (
                <button
                  key={d.kind}
                  type="button"
                  className="palette-item"
                  disabled={disabled}
                  onClick={() => {
                    onChange({ controls: [...design.controls, newControl(d.kind)] });
                    setAdding(false);
                  }}
                >
                  <strong>{d.label}</strong>
                  <span>{d.description}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" className="add-step" disabled={disabled} onClick={() => setAdding(true)}>
            + Insert control
          </button>
        )}
      </div>

      <div className="report-canvas">
        <p className="flow-kicker">Canvas · data from IT Ticketing (MCP)</p>
        <Preview controls={design.controls} catalog={catalog} />
      </div>
    </div>
  );
}
