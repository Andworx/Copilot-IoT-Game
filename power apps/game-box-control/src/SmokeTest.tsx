import { useState } from "react";
import { staffRequest } from "./apiConfig";

interface DeviceProfile {
  id: string;
  name: string;
  deviceSlug: string;
  isEnabled: boolean;
}

interface SmokeTestProps {
  profiles: DeviceProfile[];
}

type SmokeStep = "ready" | "won" | "scanned" | "claimed";
type BusyState = "create" | "claim" | null;

interface CreateWinResponse {
  claimToken?: string;
  error?: string;
  message?: string;
}

interface GrandPrizeEntryResult {
  status: "created" | "capped" | "skipped" | "error";
  entryId?: string;
  checkInCode?: string;
  currentEntries?: number;
  maxEntriesPerContact?: number;
  reason?: string;
  message?: string;
}

interface CheckInEmailPreview {
  to: string;
  firstName: string;
  checkInCode: string;
  drawingTime: string;
  eventName: string;
}

interface ClaimPrizeResponse {
  prizeName?: string;
  grandPrizeEntry?: GrandPrizeEntryResult;
  error?: string;
  message?: string;
}

function readError(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return fallback;
}

export default function SmokeTest({ profiles }: SmokeTestProps) {
  const [deviceSlug, setDeviceSlug] = useState(profiles[0]?.deviceSlug ?? "demo");
  const [contestSourceKey, setContestSourceKey] = useState("demo");
  const [claimToken, setClaimToken] = useState("");
  const [contestantFirstName, setContestantFirstName] = useState("Demo");
  const [contestantLastName, setContestantLastName] = useState("Player");
  const [contestantEmail, setContestantEmail] = useState("demo@example.com");
  const [busy, setBusy] = useState<BusyState>(null);
  const [step, setStep] = useState<SmokeStep>("ready");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [emailPreview, setEmailPreview] = useState<CheckInEmailPreview | null>(null);

  async function createWinRequest(sourceKey = contestSourceKey): Promise<CreateWinResponse> {
    const trimmedDeviceSlug = deviceSlug.trim();
    const trimmedSourceKey = sourceKey.trim();
    const res = await staffRequest("/api/create-win", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceSlug: trimmedDeviceSlug,
        contestSourceKey: trimmedSourceKey || undefined,
      }),
    });
    const body = (await res.json()) as CreateWinResponse;
    if (!res.ok || !body.claimToken) {
      throw new Error(readError(body, `create-win failed: ${res.status}`));
    }
    return body;
  }

  async function claimPrizeRequest(input: {
    token: string;
    firstName: string;
    lastName: string;
    email: string;
    shouldShareInfo: boolean;
  }): Promise<ClaimPrizeResponse> {
    const fullName = [input.firstName.trim(), input.lastName.trim()].filter(Boolean).join(" ");
    const res = await staffRequest("/api/claim-prize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        claimToken: input.token,
        contestantFirstName: input.firstName,
        contestantLastName: input.lastName,
        contestantName: fullName || undefined,
        contestantEmail: input.email,
        sharedInfo: input.shouldShareInfo,
      }),
    });
    const body = (await res.json()) as ClaimPrizeResponse;
    if (!res.ok) {
      throw new Error(readError(body, `claim-prize failed: ${res.status}`));
    }
    return body;
  }

  function formatGrandPrizeEntry(result: GrandPrizeEntryResult | undefined): string {
    if (!result) return "Grand Prize Entry status unknown";
    if (result.status === "created") return "Grand Prize Entry created";
    if (result.status === "capped") return `Grand Prize Entry capped at ${result.maxEntriesPerContact ?? result.currentEntries ?? "limit"}; the contact already has the maximum entries for this campaign`;
    if (result.status === "skipped") return `Grand Prize Entry skipped (${result.reason ?? "no reason"})`;
    return `Grand Prize Entry error (${result.message ?? "unknown error"})`;
  }

  async function winGame() {
    if (!deviceSlug.trim()) {
      setMessage({ kind: "error", text: "Device slug is required." });
      return;
    }

    setBusy("create");
    setMessage(null);
    setLastResponse(null);
    setEmailPreview(null);
    try {
      const body = await createWinRequest();
      setLastResponse(JSON.stringify(body, null, 2));
      setClaimToken(body.claimToken ?? "");
      setStep("won");
      setMessage({ kind: "success", text: "Game win created. Simulate scanning the QR to continue the claim." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Failed to create test win." });
    } finally {
      setBusy(null);
    }
  }

  function simulateQrScan() {
    if (!claimToken.trim()) {
      setMessage({ kind: "error", text: "Claim token is required before scanning the QR." });
      return;
    }
    setStep("scanned");
    setMessage({ kind: "success", text: "QR scanned. Enter contact details or skip, then spin the wheel." });
  }

  async function spinWheelAndClaim(shouldShareInfo: boolean) {
    const trimmedToken = claimToken.trim();
    if (!trimmedToken) {
      setMessage({ kind: "error", text: "Claim token is required." });
      return;
    }
    if (shouldShareInfo && !contestantEmail.trim()) {
      setMessage({ kind: "error", text: "Contestant email is required when testing contact and cap validation." });
      return;
    }

    setBusy("claim");
    setMessage(null);
    setLastResponse(null);
    setEmailPreview(null);
    try {
      const body = await claimPrizeRequest({
        token: trimmedToken,
        firstName: shouldShareInfo ? contestantFirstName : "",
        lastName: shouldShareInfo ? contestantLastName : "",
        email: shouldShareInfo ? contestantEmail : "",
        shouldShareInfo,
      });
      setLastResponse(JSON.stringify(body, null, 2));
      setStep("claimed");
      setMessage({ kind: "success", text: `Spin completed: ${body.prizeName ?? "prize"}. ${formatGrandPrizeEntry(body.grandPrizeEntry)}.` });
      if (shouldShareInfo && body.grandPrizeEntry?.status === "created") {
        setEmailPreview({
          to: contestantEmail,
          firstName: contestantFirstName.trim() || "there",
          checkInCode: body.grandPrizeEntry.checkInCode ?? "GP-DEMO-2401",
          drawingTime: "Final drawing time from the active campaign",
          eventName: "Copilot IoT Game Grand Prize Drawing",
        });
      }
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Failed to claim prize." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "1rem", marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "0.25rem" }}>Prize Claim Smoke Test</h2>
      <p style={{ color: "#555", marginTop: 0, fontSize: "0.9rem" }}>
        Simulate the real player path: win the IoT game, scan the QR, choose whether to share contact info, then spin for the committed prize.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Device slug</span>
          <input
            list="smoke-device-slugs"
            value={deviceSlug}
            onChange={(e) => setDeviceSlug(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
          />
          <datalist id="smoke-device-slugs">
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.deviceSlug}>
                {profile.name}
              </option>
            ))}
          </datalist>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Contest source key</span>
          <input
            value={contestSourceKey}
            onChange={(e) => setContestSourceKey(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
          />
        </label>
      </div>

      <button
        onClick={winGame}
        disabled={busy !== null}
        style={{
          marginTop: "0.9rem",
          padding: "0.6rem 1.2rem",
          borderRadius: 6,
          border: "none",
          fontWeight: 600,
          color: "#fff",
          background: "#2563eb",
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy === "create" ? "Creating..." : "1. Win Game"}
      </button>

      <button
        onClick={simulateQrScan}
        disabled={busy !== null || !claimToken.trim() || step === "ready"}
        style={{
          marginTop: "0.9rem",
          marginLeft: "0.6rem",
          padding: "0.6rem 1.2rem",
          borderRadius: 6,
          border: "none",
          fontWeight: 600,
          color: "#fff",
          background: "#0f766e",
          cursor: busy ? "wait" : "pointer",
          opacity: busy || !claimToken.trim() || step === "ready" ? 0.6 : 1,
        }}
      >
        2. Simulate QR Scan
      </button>

      <div style={{ marginTop: "1.25rem", borderTop: "1px solid #e5e7eb", paddingTop: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Claim token</span>
            <input
              value={claimToken}
              onChange={(e) => setClaimToken(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>First name</span>
            <input
              value={contestantFirstName}
              onChange={(e) => setContestantFirstName(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Last name</span>
            <input
              value={contestantLastName}
              onChange={(e) => setContestantLastName(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Contestant email</span>
            <input
              type="email"
              value={contestantEmail}
              onChange={(e) => setContestantEmail(e.target.value)}
              style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
            />
          </label>
        </div>

        <button
          onClick={() => spinWheelAndClaim(true)}
          disabled={busy !== null || !claimToken.trim() || step !== "scanned"}
          style={{
            marginTop: "0.9rem",
            padding: "0.6rem 1.2rem",
            borderRadius: 6,
            border: "none",
            fontWeight: 600,
            color: "#fff",
            background: "#16a34a",
            cursor: busy ? "wait" : "pointer",
            opacity: busy || !claimToken.trim() || step !== "scanned" ? 0.6 : 1,
          }}
        >
          {busy === "claim" ? "Spinning..." : "3. Enter Info & Spin"}
        </button>

        <button
          onClick={() => spinWheelAndClaim(false)}
          disabled={busy !== null || !claimToken.trim() || step !== "scanned"}
          style={{
            marginTop: "0.9rem",
            marginLeft: "0.6rem",
            padding: "0.6rem 1.2rem",
            borderRadius: 6,
            border: "none",
            fontWeight: 600,
            color: "#fff",
            background: "#64748b",
            cursor: busy ? "wait" : "pointer",
            opacity: busy || !claimToken.trim() || step !== "scanned" ? 0.6 : 1,
          }}
        >
          {busy === "claim" ? "Spinning..." : "3. Skip Info & Spin"}
        </button>
      </div>

      {message && (
        <p
          style={{
            background: message.kind === "success" ? "#f0fdf4" : "#fdecea",
            color: message.kind === "success" ? "#166534" : "#611a15",
            padding: "0.6rem 0.8rem",
            borderRadius: 6,
            fontSize: "0.9rem",
          }}
        >
          {message.text}
        </p>
      )}

      <div style={{ marginTop: "0.9rem", fontSize: "0.85rem", color: "#555" }}>
        Status: {step === "ready" ? "Ready" : step === "won" ? "Game won; QR ready" : step === "scanned" ? "QR scanned; ready to spin" : "Claim completed"}
      </div>

      {emailPreview && <GrandPrizeEmailPreview preview={emailPreview} />}

      {lastResponse && (
        <pre
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            borderRadius: 6,
            background: "#111827",
            color: "#f9fafb",
            overflowX: "auto",
            fontSize: "0.8rem",
          }}
        >
          {lastResponse}
        </pre>
      )}
    </section>
  );
}

function GrandPrizeEmailPreview({ preview }: { preview: CheckInEmailPreview }) {
  return (
    <aside
      aria-label="Sample grand prize check-in email"
      style={{
        marginTop: "1rem",
        border: "1px solid #bfdbfe",
        borderRadius: 8,
        background: "#eff6ff",
        padding: "1rem",
      }}
    >
      <p style={{ margin: "0 0 0.45rem", color: "#1d4ed8", fontSize: "0.75rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
        Sample check-in email
      </p>
      <p style={{ margin: "0 0 0.6rem", color: "#475569", fontSize: "0.85rem" }}>
        This is a local preview of the email the server-side claim flow sends after a player scans the QR code and shares contact info.
      </p>
      <div style={{ border: "1px solid #dbeafe", borderRadius: 6, background: "#fff", padding: "0.85rem" }}>
        <p style={{ margin: "0 0 0.35rem", color: "#64748b", fontSize: "0.8rem" }}>To: {preview.to}</p>
        <p style={{ margin: "0 0 0.75rem", fontWeight: 700 }}>Your grand-prize check-in code</p>
        <p style={{ margin: "0 0 0.75rem" }}>Hi {preview.firstName},</p>
        <p style={{ margin: "0 0 0.75rem" }}>
          Thanks for playing. You are entered for the {preview.eventName}. You must be present in person for the final drawing.
        </p>
        <p style={{ margin: "0 0 0.75rem" }}>Drawing time: {preview.drawingTime}</p>
        <p style={{ margin: "0", fontSize: "1.6rem", fontWeight: 800, letterSpacing: ".08em", color: "#0f172a" }}>{preview.checkInCode}</p>
      </div>
    </aside>
  );
}