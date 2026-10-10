import { COLUMN_TYPES, TABLE_FIELDS, type ColumnType, type TableDesign } from "@mcpquest/designs";
import type { DesignCatalog } from "@mcpquest/types";

interface Props {
  design: TableDesign;
  catalog: DesignCatalog;
  disabled: boolean;
  onChange: (design: TableDesign) => void;
}

function cell(type: ColumnType, value: string) {
  switch (type) {
    case "lookup-user":
    case "lookup-team":
      return <span className="chip chip-link">↗ {value}</span>;
    case "choice":
      return <span className="chip">{value}</span>;
    case "number":
      return <span className="mono">{Number.isFinite(Number(value)) ? value : "#"}</span>;
    case "date":
      return <span className="mono">2026-10-09 07:00</span>;
    default:
      return <span>{value}</span>;
  }
}

/** A small Dataverse table designer: choose a data type for each column of an Incident table. */
export function TableDesigner({ design, catalog, disabled, onChange }: Props) {
  const sample = catalog.sample;
  const valueFor = (key: string, fallback: string) => {
    if (!sample) return fallback;
    switch (key) {
      case "description":
        return sample.description;
      case "caller":
        return sample.caller;
      case "group":
        return sample.group;
      case "priority":
        return sample.priority;
      case "state":
        return sample.state;
      default:
        return sample.category;
    }
  };

  return (
    <div className="table-designer" aria-label="Table designer">
      <p className="flow-kicker">Table · Incident</p>
      <table className="records table-columns">
        <thead>
          <tr>
            <th scope="col">Column</th>
            <th scope="col">Data type</th>
            <th scope="col">A record would look like</th>
          </tr>
        </thead>
        <tbody>
          {TABLE_FIELDS.map((field) => {
            const id = `col-${field.key}`;
            return (
              <tr key={field.key}>
                <th scope="row">
                  <label htmlFor={id}>{field.label}</label>
                </th>
                <td>
                  <select
                    id={id}
                    value={design.columns[field.key]}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange({ columns: { ...design.columns, [field.key]: e.target.value as ColumnType } })
                    }
                  >
                    {COLUMN_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{cell(design.columns[field.key], valueFor(field.key, field.example))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="field-help">
        {COLUMN_TYPES.map((t) => `${t.label}: ${t.help}`).join("  ·  ")}
      </p>
    </div>
  );
}
