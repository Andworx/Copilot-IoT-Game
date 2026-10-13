import { useState } from "react";
import { useAgentChat } from "../hooks/useAgentChat";
import { isAgentActionDone, parseAgentActions, type PanelSnapshot } from "../lib/helpFixProgress";

interface HelpFixBarProps {
  isAlert: boolean;
  /** Builds the quick-fix prompt from the panel state at the moment Help Fix is tapped. */
  getPrompt: () => string;
  /** Live panel readings, used only to tick off the agent's steps as the player completes them. */
  panel: PanelSnapshot;
}

/**
 * Matches the existing AgentButton.tsx pattern: collapsed by default and, on tap,
 * shows the agent response or an explicit unreachable notice. See KIOSK_UI_SPEC.md §1.5.
 *
 * On open it sends one structured prompt (quickFixPrompt.ts) to the Copilot Studio
 * troubleshooting agent over Direct Line. The numbered list it returns is the only source of
 * steps; the agent is not asked again. Each line is hidden once the live panel readings show
 * that step is done (helpFixProgress.ts).
 */
export function HelpFixBar({ isAlert, getPrompt, panel }: HelpFixBarProps) {
  const [open, setOpen] = useState(false);
  const { status, response, sendPrompt, reset } = useAgentChat();

  function openHelp() {
    setOpen(true);
    void sendPrompt(getPrompt());
  }

  function closeHelp() {
    reset();
    setOpen(false);
  }

  const showAgentReply = status === "done" && response;
  const showUnavailable = status === "error";
  const actions = response ? parseAgentActions(response) : [];
  const remaining = actions.filter((line) => !isAgentActionDone(line, actions, panel));

  return (
    <>
      {!open && (
        <div className="help-fix-row">
          <div className="rule" />
          <button
            type="button"
            className={`help-fix-btn${isAlert ? " is-alert" : ""}`}
            onClick={openHelp}
            aria-expanded={open}
          >
            Help Fix
          </button>
          <div className="rule" />
        </div>
      )}

      <div className={`fix-sheet${open ? " is-open" : ""}`} aria-hidden={!open}>
        {open && (
          <button type="button" className="fix-close-btn" onClick={closeHelp} aria-label="Close Help Fix">
            Close
          </button>
        )}
        {status === "loading" && <div className="fix-note">Analysing panel state…</div>}
        {showAgentReply && (
          <ol>
            {remaining.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        )}
        {showUnavailable && (
          <div className="fix-unavailable" role="alert">
            Help Fix is unreachable. Please ask staff to check the Copilot Studio connection.
          </div>
        )}
      </div>
    </>
  );
}
