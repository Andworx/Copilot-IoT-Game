import type { MapLink } from "./systemMap";

/** Stable identifier for a link; walkthrough steps reference links with this key. */
export const linkKey = (link: Pick<MapLink, "from" | "to">) => `${link.from}>${link.to}`;

export interface WalkthroughStep {
  title: string;
  /** Presenter-facing talking point shown beside the diagram. */
  description: string;
  /** Node ids to emphasize. */
  nodes: string[];
  /** Link keys ("from>to") to emphasize. */
  links: string[];
  /** Optional explicit dimming. When omitted, everything not emphasized is dimmed. */
  dim?: { nodes?: string[]; links?: string[] };
  /** "flow" animates the emphasized links; omit for a static highlight. */
  animation?: "flow";
}

/** An architecture dataset's ordered presentation. Steps are data only; the engine renders them. */
export interface Walkthrough {
  id: string;
  label: string;
  steps: WalkthroughStep[];
}

export const STANDARD_WALKTHROUGH: Walkthrough = {
  id: "standard",
  label: "Standard",
  steps: [
    { title: "Physical game hardware", description: "Six switches and four sockets are the puzzle inputs; four lamps give feedback. The restore box is the only thing players physically touch.", nodes: ["inputs", "lamps"], links: ["inputs>pi", "pi>lamps"] },
    { title: "Raspberry Pi controller", description: "The panel Pi reads the GPIO inputs, evaluates the selected mode's restore contract, and drives the lamps locally. It polls kiosk state to follow the mode staff selected.", nodes: ["pi"], links: ["inputs>pi", "pi>lamps", "pi>functions"] },
    { title: "Azure IoT ingestion", description: "The Pi publishes state changes and heartbeats to IoT Hub, which routes them into Event Hub. This is the device-to-cloud leg of the live display.", nodes: ["pi", "hub", "events"], links: ["pi>hub", "hub>events"], animation: "flow" },
    { title: "Event and function processing", description: "The Function App reads the telemetry stream with its managed identity. It also serves the kiosk, staff mode selection, agent token and prize APIs.", nodes: ["events", "functions", "control"], links: ["events>functions", "control>functions"], animation: "flow" },
    { title: "SignalR real-time messaging", description: "The Function relays panel readings, mode selections and Game Mode changes to SignalR, which pushes them to the kiosk without polling.", nodes: ["functions", "signalr", "pages"], links: ["functions>signalr", "signalr>pages"], animation: "flow" },
    { title: "Power Pages experience", description: "The kiosk renders the selected instrument from live readings, calls the Function APIs for state and win creation, and asks the Copilot Studio agent for Help Fix guidance.", nodes: ["pages", "agent", "signalr"], links: ["signalr>pages", "pages>functions", "pages>agent"] },
    { title: "Dataverse and prize data", description: "The Function App is the only writer: it stores game state, telemetry events, wins and prize inventory in Dataverse, and validates prize claims from the player's phone.", nodes: ["functions", "data", "prize"], links: ["functions>data", "pages>prize", "prize>functions"] },
    { title: "End-to-end interaction", description: "A switch flips, the Pi reports it, Azure relays it, and the kiosk updates within moments. Restore the device and the win QR sends a phone to the prize wheel.", nodes: ["inputs", "pi", "hub", "events", "functions", "signalr", "pages", "data", "prize"], links: ["inputs>pi", "pi>hub", "hub>events", "events>functions", "functions>signalr", "signalr>pages", "functions>data", "pages>prize", "prize>functions"], animation: "flow" },
  ],
};
