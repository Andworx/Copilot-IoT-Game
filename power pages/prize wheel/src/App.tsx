import { useEffect, useState } from "react";
import { toWheelPrizes } from "./data/prizes";
import type { Prize } from "./types/prize";
import { PrizeWheel } from "./components/PrizeWheel";
import { API_BASE_URL } from "./lib/apiConfig";

type Step = "share" | "wheel" | "result" | "error";

interface ClaimResult {
  prizeName: string;
  redemptionCode: string;
}

/**
 * Standalone phone-facing spin page, reads `?token=` from the kiosk QR
 * (PRIZE_ENGINE_SPEC.md §3). The claim endpoint (azure/src/functions/claimPrize.ts)
 * runs the real weighted-pick + atomic-decrement server-side; this page never picks a
 * prize itself, it only plays the reveal animation for whatever the server already
 * committed to.
 */
function App() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [step, setStep] = useState<Step>(token ? "share" : "error");
  const [errorMessage, setErrorMessage] = useState("No claim token found in the link -- scan the QR on the kiosk win screen.");
  const [wheelPrizes, setWheelPrizes] = useState<Prize[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/prizes`)
      .then((res) => res.json())
      .then((data: { prizes: Array<{ name: string }> }) => {
        setWheelPrizes(toWheelPrizes(data.prizes.map((p) => p.name)));
      })
      .catch((err) => console.error("Failed to load prizes", err));
  }, []);

  async function handleContinue(sharedInfo: boolean) {
    if (claiming) return;
    setClaiming(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/claim-prize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimToken: token,
          contestantName: sharedInfo && name ? name : undefined,
          contestantEmail: sharedInfo && email ? email : undefined,
          sharedInfo,
        }),
      });
      const data = (await res.json()) as ClaimResult & { error?: string; message?: string };
      if (!res.ok) {
        setErrorMessage(
          data.error === "already_claimed"
            ? "This prize has already been claimed."
            : data.error === "no_prizes_available"
              ? "All prizes are claimed right now -- find a staff member for help."
              : "This link isn't valid. Ask a staff member for help."
        );
        setStep("error");
        return;
      }
      setClaimResult(data);
      setStep("wheel");
    } catch (err) {
      console.error("Failed to claim prize", err);
      setErrorMessage("Couldn't reach the prize server. Check your connection and try again.");
      setStep("error");
    } finally {
      setClaiming(false);
    }
  }

  function handleSpinResult() {
    setStep("result");
  }

  return (
    <div className="phone-page">
      <div className="handset-screen">
        {step === "error" && (
          <div className="phone-step">
            <span className="eyebrow">Can't spin right now</span>
            <p>{errorMessage}</p>
          </div>
        )}

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
              <button type="button" className="btn-primary" disabled={claiming} onClick={() => handleContinue(true)}>
                {claiming ? "One sec…" : "Share & continue"}
              </button>
              <button type="button" className="btn-secondary" disabled={claiming} onClick={() => handleContinue(false)}>
                Skip — just spin
              </button>
            </div>
          </div>
        )}

        {step === "wheel" && claimResult && wheelPrizes.length > 0 && (
          <div className="phone-step">
            <span className="eyebrow">Spin to win</span>
            <PrizeWheel prizes={wheelPrizes} winningPrizeName={claimResult.prizeName} onResult={handleSpinResult} />
          </div>
        )}

        {step === "result" && claimResult && (
          <div className="phone-step">
            <span className="eyebrow">Prize secured</span>
            <h3>You won:</h3>
            <div className="result-card">
              <div className="qr-caption">Redemption code</div>
              <div className="claim-code">{claimResult.redemptionCode}</div>
              <div className="prize-name">{claimResult.prizeName}</div>
            </div>
            <p>Show this code to a staff member at the prize table to collect your prize.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
