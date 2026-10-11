import type { ServerOption } from "@mcpquest/types";

interface Props {
  servers: ServerOption[] | null;
  error: string | null;
  selected: string | null;
  disabled: boolean;
  onSelect: (slug: string | null) => void;
  heading?: string;
}

/** The systems a mission can be built from. Choosing one makes a new mission just for that system. */
export function ServerPicker({ servers, error, selected, disabled, onSelect, heading = "Or build a mission from a system" }: Props) {
  return (
    <fieldset className="server-picker">
      <legend>{heading}</legend>
      {error ? (
        <p className="muted" role="status">
          {error}
        </p>
      ) : servers === null ? (
        <p className="muted" role="status">
          Looking for systems…
        </p>
      ) : servers.length === 0 ? (
        <p className="muted">No systems are available right now.</p>
      ) : (
        <div className="server-grid">
          {servers.map((s) => (
            <label key={s.slug} className={s.slug === selected ? "mode active" : "mode"} title={s.description}>
              <input
                type="radio"
                name="server"
                checked={s.slug === selected}
                onChange={() => onSelect(s.slug)}
                disabled={disabled}
              />
              <span>
                <strong>{s.name}</strong>
                <span className="cap-desc">{s.toolCount ? `${s.toolCount} tools` : "A mock system"}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
