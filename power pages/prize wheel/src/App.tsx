import { useEffect, useState } from "react";
import { toWheelPrizes } from "./data/prizes";
import type { Prize } from "./types/prize";
import { PrizeWheel } from "./components/PrizeWheel";
import { API_BASE_URL } from "./lib/apiConfig";

type Step = "share" | "wheel" | "result" | "error";

interface ClaimResult {
  prizeName: string;
}

/**
 * Standalone phone-facing spin page, reads `?token=` from the kiosk QR
 * (PRIZE_ENGINE_SPEC.md §3). The claim endpoint (azure/functions/game/src/functions/claimPrize.ts)
 * runs the real weighted-pick + atomic-decrement server-side; this page never picks a
 * prize itself, it only plays the reveal animation for whatever the server already
 * committed to.
 */
function App() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [step, setStep] = useState<Step>(token ? "share" : "error");
  const [errorMessage, setErrorMessage] = useState("No claim token found in the link -- scan the QR on the kiosk win screen.");
  const [wheelPrizes, setWheelPrizes] = useState<Prize[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [showSolution, setShowSolution] = useState(false);

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
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
    try {
      const res = await fetch(`${API_BASE_URL}/api/claim-prize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimToken: token,
          contestantFirstName: sharedInfo && firstName ? firstName : undefined,
          contestantLastName: sharedInfo && lastName ? lastName : undefined,
          contestantName: sharedInfo && fullName ? fullName : undefined,
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

  const exploreButton = (
    <button type="button" className="btn-secondary explore-solution" onClick={() => setShowSolution(true)}>
      Explore this solution
    </button>
  );

  if (showSolution) {
    return (
      <div className="phone-page">
        <div className="handset-screen">
          <div className="phone-step solution-step">
            <span className="eyebrow">Solution tour</span>
            <h3>How the IoT game pays out prizes</h3>
            <div className="solution-flow" aria-label="IoT game solution flow">
              <article>
                <span>01</span>
                <strong>Restore the device</strong>
                <p>The physical game box sends switch telemetry through Azure IoT Hub.</p>
              </article>
              <article>
                <span>02</span>
                <strong>Show the kiosk win</strong>
                <p>Power Pages renders the live device state and receives updates from the Function App.</p>
              </article>
              <article>
                <span>03</span>
                <strong>Scan the claim QR</strong>
                <p>The kiosk-created token opens this phone page without giving the player staff access.</p>
              </article>
              <article>
                <span>04</span>
                <strong>Claim from Dataverse</strong>
                <p>The API selects and reserves one stocked prize type, then falls back only when stock is empty.</p>
              </article>
            </div>
            <div className="phone-actions">
              <button type="button" className="btn-primary" onClick={() => setShowSolution(false)}>
                Back to spin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="phone-page">
      <div className="handset-screen">
        {step === "error" && (
          <div className="phone-step">
            <span className="eyebrow">Can't spin right now</span>
            <p>{errorMessage}</p>
            <div className="phone-actions">{exploreButton}</div>
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
            <div className="name-fields">
              <div className="field">
                <label htmlFor="firstNameInput">First name (optional)</label>
                <input id="firstNameInput" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Jordan" />
              </div>
              <div className="field">
                <label htmlFor="lastNameInput">Last name (optional)</label>
                <input id="lastNameInput" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Rivera" />
              </div>
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
              {exploreButton}
            </div>
          </div>
        )}

        {step === "wheel" && claimResult && wheelPrizes.length > 0 && (
          <div className="phone-step">
            <span className="eyebrow">Spin to win</span>
            <PrizeWheel prizes={wheelPrizes} winningPrizeName={claimResult.prizeName} onResult={handleSpinResult} />
            <div className="phone-actions">{exploreButton}</div>
          </div>
        )}

        {step === "result" && claimResult && (
          <div className="phone-step">
            <span className="eyebrow">Prize secured</span>
            <h3>You won:</h3>
            <div className="result-card">
              <div className="prize-name">{claimResult.prizeName}</div>
            </div>
            <p>Show this screen to a staff member at the prize table to collect your prize.</p>
            <div className="phone-actions">{exploreButton}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
