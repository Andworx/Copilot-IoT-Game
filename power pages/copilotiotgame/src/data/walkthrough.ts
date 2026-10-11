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

export const ADVANCED_WALKTHROUGH: Walkthrough = {
  id: "advanced",
  label: "Advanced",
  steps: [
    { title: "Physical demo devices and local network", description: "The restore box and Raspberry Pi sit on the demo LAN. The Pi reads GPIO, drives the lamps locally, and is the only device that talks to Azure — nothing on the show floor reaches it directly.", nodes: ["box", "pi"], links: ["box>pi"] },
    { title: "Travel router and network boundary", description: "The GL.iNet travel router is the edge of the demo network. The Pi's Azure-bound traffic leaves only through it, so the venue Wi-Fi never sees private service hostnames.", nodes: ["pi", "vpn"], links: ["box>pi", "pi>vpn"] },
    { title: "Secure path toward Azure", description: "The router holds a certificate OpenVPN point-to-site tunnel into the Azure VNet and forwards Azure service DNS zones to the private resolver. This is how the Pi reaches private address space over any venue connection.", nodes: ["vpn", "vnet"], links: ["pi>vpn", "vpn>vnet"], animation: "flow" },
    { title: "Azure network boundary and private connectivity", description: "The VNet carries the VPN gateway, the private endpoint subnet, the Function integration subnet, and the DNS inbound endpoint at 10.20.3.4. Device-facing services are reached through private endpoints, not public URLs.", nodes: ["vnet", "iot"], links: ["vpn>vnet", "vnet>iot"] },
    { title: "IoT ingestion path", description: "Telemetry enters IoT Hub through the private endpoint, routes into Event Hub, and triggers the game Function App over a dedicated consumer group using managed identity — no keys in transit.", nodes: ["iot", "events", "functions"], links: ["vnet>iot", "iot>events", "events>functions"], animation: "flow" },
    { title: "Function and event processing", description: "The game Function App processes the telemetry stream and performs all scoped Dataverse reads and writes. Anonymous endpoints are limited to kiosk reads and prize-token flows; staff side effects live behind a separate boundary.", nodes: ["events", "functions", "data"], links: ["events>functions", "functions>data"] },
    { title: "SignalR real-time return path", description: "The Function fans state and Game Mode changes out through SignalR, which pushes live updates to the kiosk browser without polling. This is the cloud-to-screen leg of the loop.", nodes: ["functions", "signalr", "pages"], links: ["functions>signalr", "signalr>pages"], animation: "flow" },
    { title: "Power Pages and Dataverse path", description: "The kiosk Code Site reads state and creates wins through the game Function, which brokers short-lived Help Fix tokens for Copilot Studio. Dataverse is reached only through the Function APIs, never directly from the browser.", nodes: ["pages", "functions", "data", "agent"], links: ["pages>functions", "functions>data", "pages>agent", "agent>functions"] },
    { title: "Public attendee-facing versus private demo infrastructure", description: "Two very different boundaries: players use the public PrizeWheel site with a scoped claim token over normal internet, while staff controls go through a per-user OAuth connector to the Entra-protected staff API, which reaches private services via VNet integration.", nodes: ["phone", "wheel", "staff", "connector", "staff-api", "functions"], links: ["phone>wheel", "pages>wheel", "wheel>functions", "staff>connector", "connector>staff-api", "staff-api>vnet"], animation: "flow" },
  ],
};
