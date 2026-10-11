import { useEffect } from "react";
import { FlowInfographic } from "./FlowInfographic";

/** The how-it-works guide, tucked behind the gear so the booth screen stays about the buckets. */
export function GuideDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="guide" role="dialog" aria-modal="true" aria-label="How Plinko works" onClick={onClose}>
      <div className="guide-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="guide-close" onClick={onClose} aria-label="Close guide">
          ×
        </button>
        <FlowInfographic />
      </div>
    </div>
  );
}
