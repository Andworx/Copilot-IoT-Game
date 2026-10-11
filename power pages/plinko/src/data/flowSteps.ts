export type FlowTier = "edge" | "cloud" | "platform";

export interface FlowStep {
  id: string;
  label: string;
  caption: string;
  tier: FlowTier;
  /** File name under src/assets/icons, without extension. Omitted steps draw a glyph. */
  icon?: string;
}

/** Idle-screen story, in the order a real drop travels through the system. */
export const FLOW_STEPS: FlowStep[] = [
  { id: "drop", label: "Drop your puck", caption: "Let it go from any slot along the top of the board.", tier: "edge" },
  { id: "lights", label: "Chase the buckets", caption: "This screen sweeps a light across the buckets. Land in the lit one for bonus entries.", tier: "platform" },
  { id: "sensor", label: "IR sensor", caption: "An infrared beam across each bucket breaks when the puck lands.", tier: "edge" },
  { id: "pi", label: "Raspberry Pi", caption: "Records your bucket and which bucket was lit, then sends it to the cloud.", tier: "edge", icon: "pi" },
  { id: "hub", label: "Azure IoT Hub", caption: "Receives the landing event securely from the board.", tier: "cloud", icon: "iothub" },
  { id: "functions", label: "Azure Functions", caption: "Checks the event is real and new, then creates your prize claim.", tier: "cloud", icon: "functions" },
  { id: "dataverse", label: "Dataverse", caption: "Stores the play, the claim and your grand-prize entries.", tier: "platform", icon: "dataverse" },
  { id: "signalr", label: "SignalR", caption: "Pushes your result to this screen in real time.", tier: "cloud", icon: "signalr" },
  { id: "pages", label: "Power Pages", caption: "This screen celebrates your win and shows your QR code.", tier: "platform", icon: "pages" },
  { id: "phone", label: "Your phone", caption: "Scan to spin the prize wheel and enter the grand-prize drawing.", tier: "platform" },
];

/** How long the travelling light rests on each step. */
export const FLOW_STEP_MS = 2600;
