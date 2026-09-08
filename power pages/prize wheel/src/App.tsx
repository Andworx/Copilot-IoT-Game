import { useState } from "react";
import { PRIZES } from "./data/prizes";
import type { Prize } from "./types/prize";
import { PrizeWheel } from "./components/PrizeWheel";

type Step = "share" | "wheel" | "result";

function randomRedemptionCode(): string {
  return `GW-${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Standalone phone-facing spin page, reads `?token=` from the kiosk QR
 * (PRIZE_ENGINE_SPEC.md §3). The actual claim call (validate token, weighted-pick,
 * atomic decrement) is a TEMPORARY client-side stand-in here — see data/prizes.ts —
 * until the real Azure Function endpoint from PRIZE_ENGINE_SPEC.md §1 exists.
 */
function App() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [step, setStep] = useState<Step>("share");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ prize: Prize; code: string } | null>(null);

  function handleResult(prize: Prize) {
    setResult({ prize, code: randomRedemptionCode() });
    setStep("result");
  }

  function handleReplay() {
    setName("");
    setEmail("");
    setResult(null);
    setStep("share");
  }

  return (
    <div className="phone-page">
      <div className="handset-screen">
        {step === "share" && (
          <div className="phone-step">
            <span className="eyebrow">You fixed it!</span>
            <h3>Want in on the leaderboard?</h3>
            <p>
              Sharing your name is optional and never affects your spin — skip it and you
              play exactly the same.
            </p>
            <div className="field">
              <label htmlFor="nameInput">Name (optional)</label>
              <input id="nameInput" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan R." />
            </div>
            <div className="field">
              <label htmlFor="emailInput">Email (optional)</label>
              <input id="emailInput" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. jordan@example.com" />
            </div>
            <div className="phone-actions">
              <button type="button" className="btn-primary" onClick={() => setStep("wheel")}>
                Share &amp; continue
              </button>
              <button type="button" className="btn-secondary" onClick={() => setStep("wheel")}>
                Skip — just spin
              </button>
            </div>
          </div>
        )}

        {step === "wheel" && (
          <div className="phone-step">
            <span className="eyebrow">Spin to win</span>
            <PrizeWheel prizes={PRIZES} onResult={handleResult} />
          </div>
        )}

        {step === "result" && result && (
          <div className="phone-step">
            <span className="eyebrow">Prize secured</span>
            <h3>You won:</h3>
            <div className="result-card">
              <div className="qr-caption">Redemption code</div>
              <div className="claim-code">{result.code}</div>
              <div className="prize-name">{result.prize.name}</div>
            </div>
            <p>
              Show this code to a staff member at the prize table to collect your prize.
              {token && " "}
              {token && <span style={{ opacity: 0.6 }}>(claim token: {token})</span>}
            </p>
            <div className="phone-actions">
              <button type="button" className="btn-secondary" onClick={handleReplay}>
                Replay demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
