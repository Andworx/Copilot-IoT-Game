import { LampDot } from "../LampDot";
import type { LampColor } from "../../types/game";

export function StatusIndicator({ label, color, isLive }: { label: string; color: LampColor; isLive: boolean }) {
  const value = !isLive ? "Unknown" : color === "off" ? "Inactive" : color === "red" ? "Attention" : color === "amber" ? "Caution" : "Active";
  return <div className="instrument-status" aria-label={`${label}: ${value}`}>
    <LampDot state={isLive ? color : "off"} shape="sq" />
    <span>{label}<small>{value}</small></span>
  </div>;
}
