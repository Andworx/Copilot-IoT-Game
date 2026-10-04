import { useEffect, useState } from "react";
import { API_BASE_URL, PRIVACY_NOTICE_URL } from "../lib/apiConfig";

interface PreferenceState {
  maskedEmail: string;
  marketing: "opted_in" | "opted_out";
  emailBlocked: boolean;
  purpose: "manage" | "confirm";
}

type Action = "opt_in" | "confirm" | "opt_out" | "remove" | "copy";

const DONE: Record<string, string> = {
  sent: "Check your email and press the confirmation link to finish subscribing.",
  confirmed: "You're subscribed. Thank you!",
  blocked: "We can't email this address, so we haven't subscribed it.",
  opted_out: "You won't get news and offers from us.",
  removed: "Your details have been removed and you won't be emailed again.",
  task_created: "Your request is in. We will remove your details and confirm within 30 days.",
  requested: "Your request is in. We will send you a copy of your data within 30 days.",
  skipped: "We couldn't send that email right now. Please try again later.",
  error: "Something went wrong. Please try again later.",
};

/**
 * Preference center (issue #133). Opened from the signed link in our emails (`?pref=`). Reading is a
 * GET; every change is a button press that POSTs, so a mail scanner opening the link changes nothing.
 */
export function PreferencePage({ token }: { token: string }) {
  const [state, setState] = useState<PreferenceState | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/preferences?token=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? (res.json() as Promise<PreferenceState>) : Promise.reject(new Error(String(res.status)))))
      .then(setState)
      .catch(() => setLoadError(true));
  }, [token]);

  async function run(action: Action) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/preferences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = (await res.json()) as { result?: string };
      setMessage(DONE[data.result ?? ""] ?? (res.ok ? "Done." : DONE.error));
      if (res.ok && data.result === "confirmed") setState((s) => (s ? { ...s, marketing: "opted_in" } : s));
      if (res.ok && (data.result === "opted_out" || data.result === "removed" || data.result === "task_created")) {
        setState((s) => (s ? { ...s, marketing: "opted_out" } : s));
      }
    } catch {
      setMessage(DONE.error);
    } finally {
      setBusy(false);
      setConfirmRemove(false);
    }
  }

  if (loadError) {
    return (
      <div className="phone-step">
        <span className="eyebrow">Preferences</span>
        <h3>This link has expired</h3>
        <p>Open the most recent email from us and use the link in it. If you need help, ask a member of the team.</p>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="phone-step">
        <span className="eyebrow">Preferences</span>
        <p>One sec…</p>
      </div>
    );
  }

  const removed = message === DONE.removed;
  return (
    <div className="phone-step pref-step">
      <span className="eyebrow">Your preferences</span>
      <h3>{state.purpose === "confirm" ? "Confirm your subscription" : "How would you like to hear from us?"}</h3>
      {state.maskedEmail && !removed && <p className="pref-email">{state.maskedEmail}</p>}
      {!removed && (
        <p>
          News and offers: <strong>{state.marketing === "opted_in" ? "on" : "off"}</strong>
        </p>
      )}
      {message && (
        <div className="pref-message" role="status">
          {message}
        </div>
      )}
      {!removed && (
        <div className="phone-actions">
          {state.purpose === "confirm" && state.marketing !== "opted_in" && (
            <button type="button" className="btn-primary" disabled={busy} onClick={() => run("confirm")}>
              Confirm my subscription
            </button>
          )}
          {state.purpose === "manage" && state.marketing === "opted_out" && !state.emailBlocked && (
            <button type="button" className="btn-primary" disabled={busy} onClick={() => run("opt_in")}>
              Send me news and offers
            </button>
          )}
          {state.marketing === "opted_in" && (
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => run("opt_out")}>
              Stop news and offers
            </button>
          )}
          {state.purpose === "manage" && (
            <>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => run("copy")}>
                Send me a copy of my data
              </button>
              {!confirmRemove ? (
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => setConfirmRemove(true)}>
                  Remove my details
                </button>
              ) : (
                <button type="button" className="btn-danger" disabled={busy} onClick={() => run("remove")}>
                  Yes, remove my details and stop all email
                </button>
              )}
            </>
          )}
        </div>
      )}
      {PRIVACY_NOTICE_URL && (
        <p className="pref-notice">
          <a href={PRIVACY_NOTICE_URL}>How we use your information</a>
        </p>
      )}
    </div>
  );
}
