import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { PRIZE_WHEEL_URL } from "../lib/apiConfig";

interface WinOverlayProps {
  winMessage: string;
  restoreItems: string[];
  claimToken: string;
  onReset: () => void;
}

const RESET_SECONDS = 10; // GAME_MODE_PLAN.md §0 — locked decision

/**
 * Full-viewport takeover — KIOSK_UI_SPEC.md §1.6. Encodes a real, scannable QR
 * pointing at the standalone prize wheel SPA with the claim token from the
 * andy_gamewin row the kiosk just created (PRIZE_ENGINE_SPEC.md §3, steps 1-2).
 */
export function WinOverlay({ winMessage, restoreItems, claimToken, onReset }: WinOverlayProps) {
  const [remaining, setRemaining] = useState(RESET_SECONDS);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // KioskDevicePage re-renders every ~400ms (telemetryTick), producing a new onReset
  // closure each time. Keeping onReset out of the effect's deps (via this ref) stops the
  // 1000ms setTimeout below from being cleared/restarted before it ever fires -- which
  // previously left the countdown frozen at RESET_SECONDS forever.
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  useEffect(() => {
    if (remaining <= 0) {
      onResetRef.current();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  useEffect(() => {
    let cancelled = false;
    const claimUrl = `${PRIZE_WHEEL_URL}/?token=${encodeURIComponent(claimToken)}`;
    QRCode.toDataURL(claimUrl, { margin: 1, width: 200 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err) => console.error("Failed to generate QR code", err));
    return () => {
      cancelled = true;
    };
  }, [claimToken]);

  return (
    <div className="win-overlay">
      <h2>{winMessage}</h2>
      <ul className="restore-grid">
        {restoreItems.map((item) => (
          <li key={item}>✓ {item}</li>
        ))}
      </ul>
      <div className="qr-block">
        {qrDataUrl && <img src={qrDataUrl} alt="Scan to claim your prize" />}
      </div>
      <div className="qr-caption">Scan to claim your prize</div>
      <div className="reset-timer">
        Resets in <strong>{remaining}</strong>s
      </div>
    </div>
  );
}
