import { useRef, type MouseEvent, type ReactNode } from "react";

interface TactileButtonProps {
  className: string;
  pressed: boolean;
  onToggle: () => void;
  children?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}

/**
 * Shared press feedback for every switch widget across all 5 layouts — see
 * KIOSK_UI_SPEC.md §1.7. Ripple is imperative DOM (not React state) since it's a
 * transient visual effect with no bearing on render output.
 */
export function TactileButton({
  className,
  pressed,
  onToggle,
  children,
  ariaLabel,
  disabled,
}: TactileButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);

  function handleClick(evt: MouseEvent<HTMLButtonElement>) {
    const el = ref.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${evt.clientX - rect.left - size / 2}px`;
      span.style.top = `${evt.clientY - rect.top - size / 2}px`;
      el.appendChild(span);
      setTimeout(() => span.remove(), 500);
    }
    onToggle();
  }

  return (
    <button
      ref={ref}
      type="button"
      className={className}
      aria-pressed={pressed}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
