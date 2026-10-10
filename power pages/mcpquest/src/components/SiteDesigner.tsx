import { SITE_SETTINGS, type SiteDesign } from "@mcpquest/designs";

interface Props {
  design: SiteDesign;
  disabled: boolean;
  onChange: (design: SiteDesign) => void;
}

function summary(design: SiteDesign): string[] {
  const lines: string[] = [];
  lines.push(design.signIn === "required" ? "Visitors are sent to sign in first." : "Anyone can open the site without signing in.");
  if (design.list === "none") lines.push("There is no incident list.");
  else if (design.list === "all") lines.push("The incident list shows every incident to whoever opens it.");
  else lines.push("The incident list shows each signed-in person only their own incidents.");
  if (design.form === "none") lines.push("There is no way to submit an incident.");
  else if (design.form === "anyone") lines.push("Anyone can submit an incident, signed in or not.");
  else lines.push("Only signed-in visitors can submit an incident.");
  return lines;
}

/** A small Power Pages studio: authentication, table permissions and form access. */
export function SiteDesigner({ design, disabled, onChange }: Props) {
  return (
    <div className="site-designer" aria-label="Site designer">
      <div className="site-settings">
        {SITE_SETTINGS.map((setting) => {
          const id = `site-${setting.key}`;
          return (
            <div key={setting.key} className="flow-card">
              <label htmlFor={id}>
                <strong>{setting.label}</strong>
              </label>
              <p className="field-help">{setting.help}</p>
              <select
                id={id}
                value={design[setting.key]}
                disabled={disabled}
                onChange={(e) => onChange({ ...design, [setting.key]: e.target.value } as SiteDesign)}
              >
                {setting.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="report-canvas">
        <p className="flow-kicker">What visitors will experience</p>
        <ul className="site-summary">
          {summary(design).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
