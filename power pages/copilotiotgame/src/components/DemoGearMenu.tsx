import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEVICE_ORDER, DEVICE_PROFILES } from "../data/deviceProfiles";

interface DemoGearMenuProps {
  currentSlug: string; // "info" or a device slug
}

/**
 * Dev/demo stand-in for the physical dial — there's no hardware yet to drive
 * `/kiosk/:deviceSlug` navigation (GAME_MODE_PLAN.md §4, README "what's stubbed"). This
 * gear button lets you jump straight to any of the 12 dial positions without one.
 *
 * Kept deliberately simple: no confirmation, no animation — it's a shortcut, not part of
 * the game itself. Worth revisiting whether this should be hidden/disabled once the real
 * dial exists, so attendees at the booth can't self-serve past the physical hardware.
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
          <div className="gear-menu-title">Demo — jump to dial position</div>
          <button type="button" role="menuitem" className={currentSlug === "info" ? "is-current" : undefined} onClick={() => go("/kiosk/info")}>
            1 — Demo / Info
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
                {device.dialPosition} — {device.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
