import { useState } from "react";

interface HelpFixBarProps {
  isAlert: boolean;
  steps: string[];
}

/**
 * Matches the existing AgentButton.tsx pattern exactly — collapsed by default, pulses
 * only while unresolved, and on tap shows ONLY a numbered list. See KIOSK_UI_SPEC.md §1.5.
 *
 * `steps` is static content for now — the real build wires this to the Copilot Studio
 * quick-fix response instead (GAME_MODE_PLAN.md §8), which is being built separately.
 */
export function HelpFixBar({ isAlert, steps }: HelpFixBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="help-fix-row">
        <div className="rule" />
        <button
          type="button"
          className={`help-fix-btn${isAlert ? " is-alert" : ""}`}
          onClick={() => setOpen((o) => !o)}
        >
          Help Fix
        </button>
        <div className="rule" />
      </div>

      <div className={`fix-sheet${open ? " is-open" : ""}`}>
        <div className="fix-title">⚡ IoT Panel Troubleshooting Agent — steps only</div>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </>
  );
}
