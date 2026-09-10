import type { LampColor } from "../types/game";

interface LampDotProps {
  state: LampColor;
  shape?: "round" | "sq" | "lg";
  extraClass?: string;
}

export function LampDot({ state, shape = "round", extraClass }: LampDotProps) {
  const classes = ["lamp-dot"];
  if (shape !== "round") classes.push(shape);
  if (extraClass) classes.push(extraClass);
  return <div className={classes.join(" ")} data-state={state} />;
}
