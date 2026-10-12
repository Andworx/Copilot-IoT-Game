import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { PRIZE_WHEEL_URL } from "../lib/apiConfig";
import logoBlue from "../assets/brand/andworx-blue.svg";
import { BUCKET_ICON_LOGOS, iconForBucket, type PlinkoResult } from "../types/plinko";

/** Long enough to pull out a phone and scan; unclaimed tokens stay valid after reset. */
const RESET_SECONDS = 45;

// Same falling Power Platform logo confetti as the grand-prize winner reveal in Game Box Control.
const CONFETTI = Array.from({ length: 28 }, (_, index) => ({
  id: index,
  left: `${(index * 37) % 100}%`,
  delay: `${(index % 8) * 0.32}s`,
  duration: `${5.6 + (index % 5) * 0.45}s`,
  logo: BUCKET_ICON_LOGOS[index % BUCKET_ICON_LOGOS.length],
}));

interface WinCelebrationProps {
  result: PlinkoResult;
  onDone: () => void;
}

export function WinCelebration({ result, onDone }: WinCelebrationProps) {
  const [remaining, setRemaining] = useState(RESET_SECONDS);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const isLit = result.bucket === result.litBucket;
  const buckets = Array.from({ length: result.bucketCount }, (_, i) => i + 1);

  // A new landing replaces the one on screen, so restart the countdown with it.
  useEffect(() => setRemaining(RESET_SECONDS), [result.eventId]);

  useEffect(() => {
    if (remaining <= 0) {
      onDoneRef.current();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  useEffect(() => {
    let cancelled = false;
    const claimUrl = `${PRIZE_WHEEL_URL}/?token=${encodeURIComponent(result.claimToken)}`;
    QRCode.toDataURL(claimUrl, { margin: 1, width: 320 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => console.error("Failed to generate QR code", err));
    return () => {
      cancelled = true;
    };
  }, [result.claimToken]);

  return (
    <section className={`win${isLit ? " win-lit" : ""}`} role="dialog" aria-modal="true" aria-labelledby="win-title">
      <div className="confetti-field" aria-hidden="true">
        {CONFETTI.map((piece) => (
          <span
            className="confetti-piece"
            key={piece.id}
            style={{ left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration, backgroundImage: `url(${piece.logo})` }}
          />
        ))}
      </div>

      <div className="win-card">
        <div className="win-result">
          <img className="win-brand" src={logoBlue} alt="Andworx" />
          <span className="eyebrow">{isLit ? "Lit bucket!" : "Nice drop!"}</span>
          <h2 id="win-title">Congratulations!</h2>
          <p className="win-bucket-line">
            You landed in <strong>bucket {result.bucket}</strong>
            {isLit ? " while it was lit." : "."}
          </p>

          <ol className="bucket-row" aria-label="Buckets">
            {buckets.map((b) => (
              <li key={b} data-landed={b === result.bucket} data-lit={b === result.litBucket}>
                <img src={iconForBucket(b, result.bucketIcons).src} alt="" aria-hidden="true" />
                <span>{b}</span>
                {b === result.litBucket && <small>lit</small>}
              </li>
            ))}
          </ol>

          <ul className="win-awards">
            <li>
              <strong>{result.entriesAwarded}</strong> grand-prize {result.entriesAwarded === 1 ? "entry" : "entries"}
            </li>
            <li>
              <strong>1</strong> prize wheel spin
            </li>
          </ul>
        </div>

        <div className="win-qr">
          <div className="qr-block">{qrDataUrl && <img src={qrDataUrl} alt="QR code to spin the prize wheel and enter the grand prize" />}</div>
          <p className="qr-caption">Scan to spin the prize wheel and claim your entries</p>
          <p className="qr-note">Share your email on your phone to enter the grand-prize drawing.</p>
          <div className="win-footer">
            <button type="button" className="btn-secondary" onClick={() => onDoneRef.current()}>
              Skip
            </button>
            <span className="reset-timer">
              Resets in <strong>{remaining}</strong>s
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
