import { useEffect, useRef, useState } from "react";

interface SuccessPopupProps {
  winMessage: string;
  restoreItems: string[];
  onReset: () => void;
}

const RESET_SECONDS = 10; // Same dwell time as WinOverlay (GAME_MODE_PLAN.md §0)

/**
 * Game Mode OFF version of WinOverlay: a full-viewport takeover confirming the fix, with
 * no QR code, no claim token, and no andy_gamewin row -- a Game Mode OFF completion is
 * intentionally not logged at all (client-side only). Reuses the same overlay/reset-timer
 * styling as WinOverlay so the two feel like the same moment to the player.
 */
export function SuccessPopup({ winMessage, restoreItems, onReset }: SuccessPopupProps) {
  const [remaining, setRemaining] = useState(RESET_SECONDS);

  // See WinOverlay.tsx for why onReset must stay out of the effect's deps: the parent
  // re-renders every second (live panel clock), which would otherwise clear/restart this
  // 1000ms timeout before it ever fires, freezing the countdown at RESET_SECONDS.
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

  return (
    <div className="win-overlay">
      <h2>{winMessage}</h2>
      <ul className="restore-grid">
        {restoreItems.map((item) => (
          <li key={item}>✓ {item}</li>
        ))}
      </ul>
      <div className="reset-timer">
        Resets in <strong>{remaining}</strong>s
      </div>
    </div>
  );
}
