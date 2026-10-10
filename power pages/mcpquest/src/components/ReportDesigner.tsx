import { REPORT_FIELDS, VISUALS, type ReportDesign } from "@mcpquest/designs";
import type { DesignCatalog, ReportField } from "@mcpquest/types";

interface Props {
  design: ReportDesign;
  catalog: DesignCatalog;
  disabled: boolean;
  onChange: (design: ReportDesign) => void;
}

const PALETTE = ["#5eead4", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa", "#fb923c", "#4ade80", "#f87171"];

function Preview({ design, catalog }: { design: ReportDesign; catalog: DesignCatalog }) {
  if (!design.field) {
    return <p className="muted">Drag a field into the well to see your data. (Choose one from the list.)</p>;
  }
  const rows = catalog.aggregates[design.field as ReportField];
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));

  if (design.visual === "card") {
    return (
      <div className="viz-card">
        <p className="viz-card-number">{total}</p>
        <p className="muted">Count of incidents</p>
      </div>
    );
  }

  if (design.visual === "table") {
    return (
      <table className="records viz-table">
        <thead>
          <tr>
            <th scope="col">{REPORT_FIELDS.find((f) => f.value === design.field)?.label}</th>
            <th scope="col" className="num">
              Count of incidents
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.value}>
              <td>{r.value}</td>
              <td className="num">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (design.visual === "donut") {
    let acc = 0;
    const stops = rows.map((r, i) => {
      const from = (acc / total) * 360;
      acc += r.count;
      const to = (acc / total) * 360;
      return `${PALETTE[i % PALETTE.length]} ${from}deg ${to}deg`;
    });
    return (
      <div className="viz-donut-wrap">
        <div className="viz-donut" style={{ background: `conic-gradient(${stops.join(", ")})` }} role="img" aria-label="Donut chart" />
        <ul className="viz-legend">
          {rows.map((r, i) => (
            <li key={r.value}>
              <span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />
              {r.value}: {r.count} ({Math.round((r.count / total) * 100)}%)
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const horizontal = design.visual === "bar";
  return (
    <div className={horizontal ? "viz-bars viz-horizontal" : "viz-bars viz-vertical"} role="img" aria-label="Bar chart">
      {rows.map((r, i) => (
        <div key={r.value} className="viz-bar-row">
          <span className="viz-bar-label">{r.value}</span>
          <span className="viz-bar-track">
            <span
              className="viz-bar-fill"
              style={{
                [horizontal ? "width" : "height"]: `${(r.count / max) * 100}%`,
                background: PALETTE[i % PALETTE.length],
              }}
            />
          </span>
          <span className="viz-bar-value">{r.count}</span>
        </div>
      ))}
    </div>
  );
}

/** A small Power BI-style report designer: pick a visual, drop a field, see live data. */
export function ReportDesigner({ design, catalog, disabled, onChange }: Props) {
  return (
    <div className="report" aria-label="Report designer">
      <div className="report-panes">
        <div className="report-pane">
          <p className="flow-kicker">Visualizations</p>
          <div className="visual-grid" role="group" aria-label="Visualization type">
            {VISUALS.map((v) => (
              <button
                key={v.kind}
                type="button"
                className={v.kind === design.visual ? "visual active" : "visual"}
                aria-pressed={v.kind === design.visual}
                disabled={disabled}
                onClick={() => onChange({ ...design, visual: v.kind })}
              >
                <strong>{v.label}</strong>
                <span>{v.description}</span>
              </button>
            ))}
          </div>

          <p className="flow-kicker">Fields</p>
          <div className="field">
            <label htmlFor="report-field">Axis / Legend</label>
            <select
              id="report-field"
              value={design.field}
              disabled={disabled}
              onChange={(e) => onChange({ ...design, field: e.target.value as ReportDesign["field"] })}
            >
              <option value="">Add a data field…</option>
              {REPORT_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="label-like">Values</span>
            <p className="well">Count of incidents</p>
          </div>
        </div>

        <div className="report-canvas">
          <p className="flow-kicker">Report canvas · data from IT Ticketing (MCP)</p>
          <Preview design={design} catalog={catalog} />
        </div>
      </div>
    </div>
  );
}
