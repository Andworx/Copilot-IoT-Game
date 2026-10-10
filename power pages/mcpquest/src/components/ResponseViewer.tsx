import { useState } from "react";
import type { CallRecord } from "@mcpquest/types";
import { tryParseJson } from "../format";

interface Props {
  calls: CallRecord[];
  selectedN: number | null;
  onSelect: (n: number) => void;
}

type View = "table" | "json" | "wire";
type FlatRecord = Record<string, string | number | boolean | null>;

function isFlatRecord(value: unknown): value is FlatRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((v) => v === null || ["string", "number", "boolean"].includes(typeof v))
  );
}

/** Returns table rows when the result looks like `{ data: [flat records], ... }`. */
function asTable(parsed: unknown): { rows: FlatRecord[]; meta: string } | null {
  if (typeof parsed !== "object" || parsed === null) return null;
  const data = (parsed as { data?: unknown }).data;
  if (!Array.isArray(data) || data.length === 0 || !data.every(isFlatRecord)) return null;
  const record = parsed as { total?: unknown; offset?: unknown };
  const parts: string[] = [`${data.length} shown`];
  if (typeof record.total === "number") parts.push(`${record.total} total`);
  if (typeof record.offset === "number" && record.offset > 0) parts.push(`offset ${record.offset}`);
  return { rows: data, meta: parts.join(" · ") };
}

export function ResponseViewer({ calls, selectedN, onSelect }: Props) {
  const [view, setView] = useState<View>("table");
  const current = calls.find((c) => c.n === selectedN) ?? calls[calls.length - 1] ?? null;

  if (!current) {
    return (
      <section className="card response" aria-labelledby="response-title">
        <h2 id="response-title">Response</h2>
        <p className="muted">Run a tool to see what comes back. Every call is logged here.</p>
      </section>
    );
  }

  const parsed = tryParseJson(current.text);
  const table = parsed !== undefined ? asTable(parsed) : null;
  const columns = table ? Object.keys(table.rows[0]) : [];
  const pretty = parsed !== undefined ? JSON.stringify(parsed, null, 2) : current.text;
  const hasWire = Boolean(current.wire);
  // Fall back gracefully when the chosen view is not available for this call.
  const effective: View = view === "wire" && !hasWire ? "json" : view === "table" && !table ? "json" : view;

  const tabs: { id: View; label: string; show: boolean }[] = [
    { id: "table", label: "Table", show: table !== null },
    { id: "json", label: "Result JSON", show: true },
    { id: "wire", label: "MCP messages", show: hasWire },
  ];

  return (
    <section className="card response" aria-labelledby="response-title">
      <div className="card-head">
        <h2 id="response-title">Response</h2>
        <div className="view-switch" role="group" aria-label="Response view">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                className={effective === t.id ? "seg active" : "seg"}
                aria-pressed={effective === t.id}
                onClick={() => setView(t.id)}
              >
                {t.label}
              </button>
            ))}
        </div>
      </div>

      <p className="call-meta">
        <code>
          #{current.n} {current.tool}
          {Object.keys(current.args).length > 0 ? ` ${JSON.stringify(current.args)}` : ""}
        </code>
        <span className={current.isError ? "pill pill-bad" : "pill"}>{current.isError ? "error" : "ok"}</span>
        <span className="muted">{current.durationMs} ms</span>
      </p>

      <div className="response-body" aria-live="polite">
        {effective === "table" && table ? (
          <>
            <div className="table-scroll">
              <table className="records">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c} scope="col">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, i) => (
                    <tr key={i}>
                      {columns.map((c) => (
                        <td key={c}>{String(row[c] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted">{table.meta}</p>
          </>
        ) : null}

        {effective === "json" ? <pre className="raw">{pretty}</pre> : null}

        {effective === "wire" && current.wire ? (
          <div className="wire">
            <h3>Request (page → MCP server)</h3>
            <pre className="raw">{JSON.stringify(current.wire.request, null, 2)}</pre>
            <h3>Response (MCP server → page)</h3>
            <pre className="raw">{JSON.stringify(current.wire.response, null, 2)}</pre>
          </div>
        ) : null}
      </div>

      {calls.length > 1 ? (
        <div className="call-log">
          <h3>Call history</h3>
          <ol reversed>
            {[...calls].reverse().map((call) => (
              <li key={call.n}>
                <button
                  type="button"
                  className={call.n === current.n ? "log-item active" : "log-item"}
                  onClick={() => onSelect(call.n)}
                >
                  <span>#{call.n}</span> {call.tool}
                  {call.isError ? " (error)" : ""}
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  );
}
