import { useEffect, useMemo, useState } from "react";

interface WinOverlayProps {
  winMessage: string;
  restoreItems: string[];
  claimToken: string;
  onReset: () => void;
}

const RESET_SECONDS = 10; // GAME_MODE_PLAN.md §0 — locked decision

/**
 * Full-viewport takeover — KIOSK_UI_SPEC.md §1.6. The QR pattern here is a
 * visually-plausible placeholder (no real encoder), same as the prototype. The real
 * build points it at `/play-spin?token=<claimToken>` once andy_gamewin exists
 * (PRIZE_ENGINE_SPEC.md §3, steps 1-2).
 */
export function WinOverlay({ winMessage, restoreItems, claimToken, onReset }: WinOverlayProps) {
  const [remaining, setRemaining] = useState(RESET_SECONDS);

  useEffect(() => {
    if (remaining <= 0) {
      onReset();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onReset]);

  const cells = useMemo(() => buildFakeQr(claimToken), [claimToken]);

  return (
    <div className="win-overlay">
      <h2>{winMessage}</h2>
      <ul className="restore-grid">
        {restoreItems.map((item) => (
          <li key={item}>✓ {item}</li>
        ))}
      </ul>
      <div className="qr-block">
        {cells.map((on, i) => (
          <div key={i} className={on ? "cell on" : "cell"} />
        ))}
      </div>
      <div className="qr-caption">Scan to claim your prize</div>
      <div className="reset-timer">
        Resets in <strong>{remaining}</strong>s
      </div>
    </div>
  );
}

function buildFakeQr(seed: string): boolean[] {
  const size = 11;
  const cells: boolean[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const isFinder = (r < 3 && c < 3) || (r < 3 && c > size - 4) || (r > size - 4 && c < 3);
      if (isFinder) {
        cells.push(
          (r + c) % 2 === 0 ||
            (r === 1 && c === 1) ||
            (r === 1 && c === size - 2) ||
            (r === size - 2 && c === 1),
        );
      } else {
        h = (h * 1103515245 + 12345) >>> 0;
        cells.push(h % 100 > 45);
      }
    }
  }
  return cells;
}
