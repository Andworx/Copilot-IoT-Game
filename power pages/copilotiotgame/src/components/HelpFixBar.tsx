import { useState } from "react";
import { useAgentChat } from "../hooks/useAgentChat";

interface HelpFixBarProps {
  isAlert: boolean;
  /** Static restore steps, shown while the agent is unavailable or fails. */
  steps: string[];
  /** Builds the quick-fix prompt from the panel state at the moment Help Fix is tapped. */
  getPrompt: () => string;
}

/**
 * Matches the existing AgentButton.tsx pattern exactly: collapsed by default and, on tap,
 * shows only a numbered list. See KIOSK_UI_SPEC.md §1.5.
 *
 * On open it sends one structured prompt (quickFixPrompt.ts) to the Copilot Studio
 * troubleshooting agent over Direct Line and shows the numbered list it returns. Until the
 * agent is configured (or if the call fails) it shows `steps` instead, so the bar always
 * has something useful to say.
 */
export function HelpFixBar({ isAlert, steps, getPrompt }: HelpFixBarProps) {
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
  const showFallback = status === "error";

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
        {showAgentReply && <div className="fix-response">{response}</div>}
        {showFallback && (
          <ol>
            {steps.map((step) => (
              <li key={step}>{step.replace(/^\d+\.\s*/, "")}</li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
