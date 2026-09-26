import { useState } from "react";
import { API_BASE_URL } from "./apiConfig";

interface DeviceProfile {
  id: string;
  name: string;
  deviceSlug: string;
  isEnabled: boolean;
}

interface SmokeTestProps {
  profiles: DeviceProfile[];
}

type SmokeStep = "idle" | "created" | "claimed";

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
  const [contestantName, setContestantName] = useState("Demo Player");
  const [contestantEmail, setContestantEmail] = useState("demo@example.com");
  const [sharedInfo, setSharedInfo] = useState(true);
  const [busy, setBusy] = useState<"create" | "claim" | null>(null);
  const [step, setStep] = useState<SmokeStep>("idle");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);

  async function createWin() {
    const trimmedDeviceSlug = deviceSlug.trim();
    const trimmedSourceKey = contestSourceKey.trim();
    if (!trimmedDeviceSlug) {
      setMessage({ kind: "error", text: "Device slug is required." });
      return;
    }

    setBusy("create");
    setMessage(null);
    setLastResponse(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/create-win`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceSlug: trimmedDeviceSlug,
          contestSourceKey: trimmedSourceKey || undefined,
        }),
      });
      const body = (await res.json()) as { claimToken?: string; error?: string; message?: string };
      setLastResponse(JSON.stringify(body, null, 2));
      if (!res.ok || !body.claimToken) {
        throw new Error(readError(body, `create-win failed: ${res.status}`));
      }
      setClaimToken(body.claimToken);
      setStep("created");
      setMessage({ kind: "success", text: "Created Prize Claim and IoT Game Win. Claim token is ready." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Failed to create test win." });
    } finally {
      setBusy(null);
    }
  }

  async function claimPrize() {
    const trimmedToken = claimToken.trim();
    if (!trimmedToken) {
      setMessage({ kind: "error", text: "Claim token is required." });
      return;
    }

    setBusy("claim");
    setMessage(null);
    setLastResponse(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/claim-prize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimToken: trimmedToken,
          contestantName,
          contestantEmail,
          sharedInfo,
        }),
      });
      const body = (await res.json()) as { prizeName?: string; error?: string; message?: string };
      setLastResponse(JSON.stringify(body, null, 2));
      if (!res.ok) {
        throw new Error(readError(body, `claim-prize failed: ${res.status}`));
      }
      setStep("claimed");
      setMessage({
        kind: "success",
        text: `Claimed ${body.prizeName ?? "prize"}.`,
      });
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
        Create a test win, then claim it with contact details to verify Prize Claim, IoT Game Win, Contact, and Grand Prize Entry writes.
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
        onClick={createWin}
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
        {busy === "create" ? "Creating..." : "Create Test Win"}
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
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Contestant name</span>
            <input
              value={contestantName}
              onChange={(e) => setContestantName(e.target.value)}
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

        <label style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.75rem", fontSize: "0.9rem" }}>
          <input type="checkbox" checked={sharedInfo} onChange={(e) => setSharedInfo(e.target.checked)} />
          Share contact info and create Grand Prize Entry
        </label>

        <button
          onClick={claimPrize}
          disabled={busy !== null || !claimToken.trim()}
          style={{
            marginTop: "0.9rem",
            padding: "0.6rem 1.2rem",
            borderRadius: 6,
            border: "none",
            fontWeight: 600,
            color: "#fff",
            background: "#16a34a",
            cursor: busy ? "wait" : "pointer",
            opacity: busy || !claimToken.trim() ? 0.6 : 1,
          }}
        >
          {busy === "claim" ? "Claiming..." : "Claim Prize"}
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
        Status: {step === "idle" ? "Ready" : step === "created" ? "Token created" : "Claim completed"}
      </div>

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