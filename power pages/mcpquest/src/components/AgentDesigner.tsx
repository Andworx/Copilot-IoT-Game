import { AGENT_ACTIONS, KNOWLEDGE_SOURCES, type AgentDesign } from "@mcpquest/designs";

interface Props {
  design: AgentDesign;
  disabled: boolean;
  onChange: (design: AgentDesign) => void;
}

function toggle(list: string[], id: string, on: boolean): string[] {
  return on ? [...new Set([...list, id])] : list.filter((x) => x !== id);
}

/** A small Copilot Studio agent editor: what the agent knows and what it can do. */
export function AgentDesigner({ design, disabled, onChange }: Props) {
  return (
    <div className="agent-designer" aria-label="Agent designer">
      <div className="flow-card">
        <p className="flow-kicker">Knowledge</p>
        <p className="field-help">What the agent may use to answer questions. Less is safer.</p>
        <ul className="check-list">
          {KNOWLEDGE_SOURCES.map((s) => {
            const id = `knowledge-${s.id}`;
            return (
              <li key={s.id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={design.knowledge.includes(s.id)}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...design, knowledge: toggle(design.knowledge, s.id, e.target.checked) })}
                />
                <label htmlFor={id}>{s.label}</label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flow-card">
        <p className="flow-kicker">Actions · IT Ticketing (MCP)</p>
        <p className="field-help">What the agent may do on someone's behalf.</p>
        <ul className="check-list">
          {AGENT_ACTIONS.map((a) => {
            const id = `action-${a.id}`;
            return (
              <li key={a.id}>
                <input
                  id={id}
                  type="checkbox"
                  checked={design.actions.includes(a.id)}
                  disabled={disabled}
                  onChange={(e) => onChange({ ...design, actions: toggle(design.actions, a.id, e.target.checked) })}
                />
                <label htmlFor={id}>
                  <strong>{a.label}</strong>
                  {a.writes ? <span className="pill pill-warn">changes data</span> : null}
                  <span className="cap-desc">{a.description}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
