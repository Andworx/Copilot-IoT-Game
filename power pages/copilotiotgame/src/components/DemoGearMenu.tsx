import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DEVICE_ORDER, DEVICE_PROFILES } from "../data/deviceProfiles";

interface DemoGearMenuProps {
  currentSlug: string; // "info" or a device slug
  azureConnected?: boolean;
  iotConnected?: boolean;
  iotAgeSeconds?: number;
}

/** Connection status and info; local development also exposes display previews. */
export function DemoGearMenu({ currentSlug, azureConnected = false, iotConnected = false, iotAgeSeconds }: DemoGearMenuProps) {
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
        aria-label="Connection and display options"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⚙
      </button>

      {open && (
        <div className="gear-menu" role="menu">
          <div className="gear-status" aria-label="Connection status">
            <div>
              <span>IoT device</span>
              <strong data-state={iotConnected ? "connected" : "offline"}>
                {iotConnected ? `Connected${iotAgeSeconds === undefined ? "" : ` · ${iotAgeSeconds}s ago`}` : "Offline"}
              </strong>
            </div>
            <div>
              <span>Azure</span>
              <strong data-state={azureConnected ? "connected" : "offline"}>{azureConnected ? "Connected" : "Offline"}</strong>
            </div>
          </div>
          <div className="gear-menu-title">Live mode is selected in Game Box Control</div>
          <button type="button" role="menuitem" className={currentSlug === "info" ? "is-current" : undefined} onClick={() => go("/kiosk/info")}>
            Info — Demo / How to Play
          </button>
          {import.meta.env.DEV && DEVICE_ORDER.map((slug) => {
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
