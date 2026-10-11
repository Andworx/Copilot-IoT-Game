import { PRODUCT_FOR_DESIGNER, buildSettings, settingsValues, type DesignField } from "@mcpquest/specDesigns";
import type { DesignerKind } from "@mcpquest/types";

interface Props {
  designer: DesignerKind;
  fields: DesignField[];
  design: unknown;
  disabled: boolean;
  onChange: (design: Record<string, unknown>) => void;
}

/**
 * The designer for cases the judge inspects rather than runs (a report, a table, security
 * roles): one labelled field for each setting the case's checks read. The labels come from the
 * setting names; the values are for the player to work out from the brief, the requirements and
 * the sample records.
 */
export function SettingsDesigner({ designer, fields, design, disabled, onChange }: Props) {
  const values = settingsValues(fields, design);
  const noun = PRODUCT_FOR_DESIGNER[designer].noun;

  const set = (path: string, raw: string) => onChange(buildSettings(fields, { ...values, [path]: raw }));

  if (fields.length === 0) {
    return <p className="muted">This {noun} has no settings to configure.</p>;
  }

  return (
    <div className="flow" aria-label={`${noun} designer`}>
      <div className="flow-card">
        <p className="flow-kicker">Settings</p>
        <div className="flow-params">
          {fields.map((f) => {
            const id = `setting-${f.path.replace(/[^A-Za-z0-9]+/g, "-")}`;
            return (
              <div key={f.path} className="field">
                <label htmlFor={id}>{f.label}</label>
                {f.kind === "boolean" ? (
                  <select id={id} value={values[f.path] ?? ""} disabled={disabled} onChange={(e) => set(f.path, e.target.value)}>
                    <option value="">Choose…</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    id={id}
                    type={f.kind === "number" ? "number" : "text"}
                    step={f.kind === "number" ? "any" : undefined}
                    value={values[f.path] ?? ""}
                    disabled={disabled}
                    onChange={(e) => set(f.path, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
