import { PRIVILEGES, ROLES, type Privilege, type RoleKey, type SecurityDesign } from "@mcpquest/designs";

interface Props {
  design: SecurityDesign;
  disabled: boolean;
  onChange: (design: SecurityDesign) => void;
}

/** A small Dataverse security-role editor: which role may do what to the Incident table. */
export function SecurityDesigner({ design, disabled, onChange }: Props) {
  const toggle = (role: RoleKey, privilege: Privilege, value: boolean) =>
    onChange({
      roles: { ...design.roles, [role]: { ...design.roles[role], [privilege]: value } },
    });

  return (
    <div className="security-designer" aria-label="Security role designer">
      <p className="flow-kicker">Security roles · Incident table</p>
      <table className="records table-columns">
        <thead>
          <tr>
            <th scope="col">Role</th>
            {PRIVILEGES.map((p) => (
              <th key={p.key} scope="col" className="center">
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROLES.map((role) => (
            <tr key={role.key}>
              <th scope="row">
                {role.label}
                <span className="cap-desc">{role.who}</span>
              </th>
              {PRIVILEGES.map((p) => {
                const id = `priv-${role.key}-${p.key}`;
                return (
                  <td key={p.key} className="center">
                    <input
                      id={id}
                      type="checkbox"
                      checked={design.roles[role.key][p.key]}
                      disabled={disabled}
                      aria-label={`${role.label}: ${p.label}`}
                      onChange={(e) => toggle(role.key, p.key, e.target.checked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
