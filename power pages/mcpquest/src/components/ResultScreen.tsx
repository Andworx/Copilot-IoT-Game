import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { LeaderboardEntry, Objective, SessionInfo, SubmitResult } from "@mcpquest/types";
import { PRIZE_WHEEL_URL } from "../config";
import { formatDuration } from "../format";
import { Leaderboard } from "./Leaderboard";

interface Props {
  session: SessionInfo;
  nickname: string;
  result: SubmitResult;
  isPreview: boolean;
  leaderboard: LeaderboardEntry[] | null;
  leaderboardError: string | null;
  onPlayAgain: () => void;
}

function objectiveTitle(objectives: Objective[], id: string): string {
  const found = objectives.find((o) => o.id === id);
  return found?.label ?? found?.prompt ?? id;
}

export function ResultScreen({
  session,
  nickname,
  result,
  isPreview,
  leaderboard,
  leaderboardError,
  onPlayAgain,
}: Props) {
  const { score } = result;
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!result.claimToken) {
      setQrUrl(null);
      return;
    }
    let cancelled = false;
    const claimUrl = `${PRIZE_WHEEL_URL}/?token=${encodeURIComponent(result.claimToken)}`;
    QRCode.toDataURL(claimUrl, { margin: 1, width: 220 })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch((error: unknown) => console.error("Failed to generate MCP Quest prize QR", error));
    return () => {
      cancelled = true;
    };
  }, [result.claimToken]);

  const correctCount = score.objectives.filter((o) => o.correct).length;
  const generated = session.modeSlug.startsWith("spec:");

  return (
    <div className="result-grid">
      <section className="card result-main" aria-labelledby="result-title">
        <p className="eyebrow">{score.passed ? "Mission complete" : "Run finished"}</p>
        <h2 id="result-title">
          {score.passed
            ? `Nice work, ${nickname}.`
            : generated
              ? `${correctCount} of ${score.objectives.length} cases complete, ${nickname}.`
              : correctCount === score.objectives.length
                ? `All correct, ${nickname}, but short of the prize score.`
                : `${correctCount} of ${score.objectives.length} correct, ${nickname}.`}
        </h2>

        <p className="big-score" aria-label={`Score ${score.total}`}>
          {score.total}
          <span> / {session.maxScore}</span>
        </p>
        <p className="muted">
          {result.rank ? `Rank #${result.rank} · ` : ""}
          {formatDuration(score.durationSeconds)} · {generated ? "" : `${score.callCount} tool ${score.callCount === 1 ? "call" : "calls"} · `}{score.hintsUsed}{" "}
          {score.hintsUsed === 1 ? "hint" : "hints"}
        </p>

        <table className="breakdown">
          <caption className="visually-hidden">Score breakdown</caption>
          <tbody>
            {score.objectives.map((o) => (
              <tr key={o.id}>
                <th scope="row">
                  <span className={o.correct ? "tick ok" : o.partial ? "tick part" : "tick bad"} aria-hidden="true">
                    {o.correct ? "✓" : o.partial ? "~" : "✗"}
                  </span>
                  <span className="visually-hidden">
                    {o.correct ? "Correct: " : o.partial ? "Right product, wrong capability: " : "Incorrect: "}
                  </span>
                  {objectiveTitle(session.objectives, o.id)}
                  {o.pickPoints !== undefined ? (
                    <span className="muted">
                      {" "}
                      (tool +{o.pickPoints}, build +{o.buildPoints ?? 0})
                    </span>
                  ) : null}
                </th>
                <td className="num">+{o.points}</td>
              </tr>
            ))}
            {generated ? null : (
              <>
                <tr>
                  <th scope="row">Speed bonus</th>
                  <td className="num">+{score.timeBonus}</td>
                </tr>
                <tr>
                  <th scope="row">Extra tool calls</th>
                  <td className="num">−{score.efficiencyPenalty}</td>
                </tr>
              </>
            )}
            <tr>
              <th scope="row">Hints</th>
              <td className="num">−{score.hintPenalty}</td>
            </tr>
            <tr className="total">
              <th scope="row">Total</th>
              <td className="num">{score.total}</td>
            </tr>
          </tbody>
        </table>

        {result.cases && result.cases.length > 0 ? (
          <div className="remediation">
            <h3>What you built</h3>
            <ul>
              {result.cases.map((c) => {
                const allMet = c.criteria.length > 0 && c.criteria.every((k) => k.ok);
                return (
                  <li key={c.objectiveId} className={allMet ? "fix-ok" : "fix-miss"}>
                    <p className="fix-case">{c.caseTitle}</p>
                    <p>
                      <strong>{generated ? "Product:" : "Tool:"}</strong> {c.chosenProduct ?? "none chosen"}
                      {generated ? "" : c.chosenProduct === c.bestProduct ? " ✓" : ` (best fit: ${c.bestProduct})`}
                      {c.misses > 0 ? ` · ${c.misses} wrong ${c.misses === 1 ? "choice" : "choices"}` : ""}
                    </p>
                    <ul className="criteria">
                      {c.criteria.map((k) => (
                        <li key={k.label} className={k.ok ? "req ok" : "req bad"}>
                          <span aria-hidden="true">{k.ok ? "✓" : "✗"}</span>
                          {k.label}
                        </li>
                      ))}
                    </ul>
                    <p className="muted">{c.why}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {result.claimToken ? (
          <div className="claim">
            <div className="qr-card">
              {qrUrl ? <img src={qrUrl} alt="Scan to claim your instant prize" /> : <span>QR loading</span>}
            </div>
            <div>
              <h3>Claim your prize</h3>
              {result.entries ? (
                <p>
                  <strong>
                    {result.entries.awarded} grand prize {result.entries.awarded === 1 ? "entry" : "entries"}
                  </strong>{" "}
                  for a score of {score.percent} out of 100.
                </p>
              ) : null}
              <p>Scan the code with your phone to spin for your instant prize.</p>
              {isPreview ? (
                <p className="preview-note">Test mode: this code is a placeholder and will not redeem.</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="muted">
            {generated
              ? "This mission was not checked for prizes, so there is no code to scan. Your score is still on the board."
              : session.objectives.some((o) => o.kind === "build")
              ? `Prize needs every solution to meet all of its requirements and at least ${session.passScore} points. Give it another go.`
              : `Prize needs every answer correct and at least ${session.passScore} points. Give it another go.`}
          </p>
        )}

        <button type="button" className="primary" onClick={onPlayAgain}>
          Next player
        </button>
      </section>

      <section className="card">
        <h2>High scores</h2>
        <Leaderboard
          entries={leaderboard}
          error={leaderboardError}
          highlight={{ nickname, score: score.total }}
        />
      </section>
    </div>
  );
}
