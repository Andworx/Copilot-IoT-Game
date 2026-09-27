import { useState } from "react";
import { API_BASE_URL, GRAND_PRIZE_CHECK_IN_FUNCTION_KEY } from "./apiConfig";

interface CheckInResponse {
  status: "checked_in" | "already_checked_in" | "invalid" | "expired" | "invalidated" | "ineligible";
  message?: string;
  participantName?: string;
  participantCode?: string;
  checkedInEntryCount?: number;
  totalEntryCount?: number;
  checkedInAt?: string;
  campaignName?: string;
}

function statusText(response: CheckInResponse) {
  if (response.message) return response.message;
  if (response.status === "checked_in") return "Check-in complete.";
  if (response.status === "already_checked_in") return "This code was already checked in.";
  if (response.status === "expired") return "This check-in code is expired.";
  if (response.status === "invalidated") return "This check-in code has been invalidated.";
  if (response.status === "ineligible") return "This entry is not eligible for the grand-prize drawing.";
  return "This check-in code was not found.";
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export default function GrandPrizeCheckIn() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckInResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitCheckIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checkInCode = normalizeCode(code);
    if (!checkInCode) {
      setError("Enter or scan a check-in code.");
      setResult(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/grand-prize/check-in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(GRAND_PRIZE_CHECK_IN_FUNCTION_KEY ? { "x-functions-key": GRAND_PRIZE_CHECK_IN_FUNCTION_KEY } : {}),
        },
        body: JSON.stringify({ checkInCode }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<CheckInResponse> & { error?: string };
      if (!response.ok) throw new Error(body.message ?? body.error ?? `check-in failed: ${response.status}`);
      const nextResult: CheckInResponse = {
        status: body.status ?? "checked_in",
        message: body.message,
        participantName: body.participantName,
        participantCode: body.participantCode ?? checkInCode,
        checkedInEntryCount: body.checkedInEntryCount,
        totalEntryCount: body.totalEntryCount,
        checkedInAt: body.checkedInAt,
        campaignName: body.campaignName,
      };
      setResult(nextResult);
      if (nextResult.status === "checked_in") setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to check in this code.");
    } finally {
      setSubmitting(false);
    }
  }

  const isSuccess = result?.status === "checked_in" || result?.status === "already_checked_in";

  return (
    <section className="check-in-workspace" aria-label="Grand prize check-in">
      <div className="check-in-card">
        <div>
          <p className="eyebrow">FINAL DRAWING</p>
          <h2>Check in a contestant</h2>
          <p className="section-description">
            Enter or scan the emailed check-in code. The Function validates the campaign, contact, status, and eligibility before PrizeEngine marks entries present.
          </p>
        </div>

        <form className="check-in-form" onSubmit={submitCheckIn}>
          <label htmlFor="check-in-code">Check-in code</label>
          <div className="check-in-entry-row">
            <input
              id="check-in-code"
              value={code}
              onChange={(event) => setCode(normalizeCode(event.target.value))}
              placeholder="SCAN OR TYPE CODE"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              autoFocus
            />
            <button type="submit" className="primary-action" disabled={submitting}>
              {submitting ? "Checking..." : "Check in"}
            </button>
          </div>
        </form>

        {error && <p className="check-in-message check-in-message-error" role="alert">{error}</p>}
        {result && (
          <div className={isSuccess ? "check-in-result check-in-result-success" : "check-in-result check-in-result-warning"} role="status">
            <span>{isSuccess ? "Accepted" : "Review"}</span>
            <h3>{statusText(result)}</h3>
            <dl>
              {result.participantName && <><dt>Name</dt><dd>{result.participantName}</dd></>}
              {result.participantCode && <><dt>Code</dt><dd>{result.participantCode}</dd></>}
              {result.campaignName && <><dt>Campaign</dt><dd>{result.campaignName}</dd></>}
              {typeof result.checkedInEntryCount === "number" && <><dt>Checked-in entries</dt><dd>{result.checkedInEntryCount}</dd></>}
              {typeof result.totalEntryCount === "number" && <><dt>Total entries</dt><dd>{result.totalEntryCount}</dd></>}
              {result.checkedInAt && <><dt>Checked in at</dt><dd>{new Date(result.checkedInAt).toLocaleString()}</dd></>}
            </dl>
          </div>
        )}
      </div>
    </section>
  );
}