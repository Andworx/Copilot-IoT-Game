import { useEffect, useRef, useState } from "react";
import { SuccessMoment } from "./SuccessMoment";

interface SuccessPopupProps {
  deviceSlug: string;
  winMessage: string;
  onReset: () => void;
}

const RESET_SECONDS = 10; // Same dwell time as WinOverlay (GAME_MODE_PLAN.md §0)

/**
 * Game Mode OFF version of WinOverlay: a full-viewport takeover confirming the fix, with
 * no QR code, no claim token, and no andy_gamewin row -- a Game Mode OFF completion is
 * intentionally not logged at all (client-side only). Reuses the same overlay/reset-timer
 * styling as WinOverlay so the two feel like the same moment to the player.
 */
export function SuccessPopup({ deviceSlug, winMessage, onReset }: SuccessPopupProps) {
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
    <div className="win-overlay device-win-overlay">
      <SuccessMoment deviceSlug={deviceSlug} />
      <h2>{winMessage}</h2>
      <div className="reset-timer">
        Resets in <strong>{remaining}</strong>s
      </div>
    </div>
  );
}
