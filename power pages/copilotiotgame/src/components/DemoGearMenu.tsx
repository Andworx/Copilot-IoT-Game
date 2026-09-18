import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEVICE_ORDER, DEVICE_PROFILES } from "../data/deviceProfiles";

interface DemoGearMenuProps {
  currentSlug: string; // "info" or a device slug
}

/**
 * Dev/demo shortcut for selecting a playable mode without using the Power App.
 * Kept deliberately simple: no confirmation, no animation — it's a shortcut, not part of
 * the game itself.
 */
export function DemoGearMenu({ currentSlug }: DemoGearMenuProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div ref={rootRef}>
      <button
        type="button"
        className="gear-btn"
        aria-label="Demo: switch device mode"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>

      {open && (
        <div className="gear-menu" role="menu">
          <div className="gear-menu-title">Demo — jump to mode</div>
          <button type="button" role="menuitem" className={currentSlug === "info" ? "is-current" : undefined} onClick={() => go("/kiosk/info")}>
            Info — Demo / How to Play
          </button>
          {DEVICE_ORDER.map((slug) => {
            const device = DEVICE_PROFILES[slug];
            return (
              <button
                key={slug}
                type="button"
                role="menuitem"
                className={currentSlug === slug ? "is-current" : undefined}
                onClick={() => go(`/kiosk/${slug}`)}
              >
                {device.modeIndex} — {device.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
