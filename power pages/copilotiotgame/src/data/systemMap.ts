export type MapTier = "edge" | "cloud" | "platform";
export interface MapNode { id: string; label: string; subtitle: string; tier: MapTier; x: number; y: number; icon?: string; detail: string; }
export const MAP_NODES: MapNode[] = [
  { id: "inputs", label: "Switches & sockets", subtitle: "Physical inputs", tier: "edge", x: 20, y: 18, detail: "Six switches and four sockets provide the physical puzzle inputs. Cable connections and switch positions are read by the panel Pi. Use the gear menu in a device mode to see its required setup." },
  { id: "pi", label: "Raspberry Pi", subtitle: "Panel controller", tier: "edge", x: 50, y: 18, icon: "pi", detail: "The panel controller reads GPIO inputs, evaluates the selected mode, drives the lamps and publishes state changes and heartbeats to IoT Hub. It polls kiosk state to follow the mode selected by staff." },
  { id: "lamps", label: "Status lamps", subtitle: "Physical outputs", tier: "edge", x: 80, y: 18, detail: "The Pi drives the physical LEDs from the active mode logic. The kiosk separately renders semantic status indicators from the same control contract." },
  { id: "hub", label: "IoT Hub", subtitle: "Device messaging", tier: "cloud", x: 15, y: 49, icon: "iothub", detail: "Receives panel telemetry from the Raspberry Pi and routes it through the configured Event Hub pipeline. This is the device-to-cloud leg of the live display." },
  { id: "events", label: "Event Hub", subtitle: "Telemetry stream", tier: "cloud", x: 38, y: 49, icon: "iothub", detail: "The iot-telemetry event stream feeds the Function App through its dedicated consumer group. The deployed Function uses managed identity to read events." },
  { id: "functions", label: "Azure Functions", subtitle: "Events & game API", tier: "cloud", x: 61, y: 49, icon: "functions", detail: "Relays telemetry to SignalR and records state-change and win events in Dataverse. HTTP APIs supply kiosk state, staff mode selection, agent tokens, win creation and prize claiming. Automatic mode rotation also runs through this API." },
  { id: "signalr", label: "SignalR", subtitle: "Real-time push", tier: "cloud", x: 84, y: 49, icon: "signalr", detail: "Pushes panel readings, mode selections and Game Mode changes to the kiosk. The connection indicator on this page reports this browser connection only, not the health of every component." },
  { id: "control", label: "Game Box Control", subtitle: "Staff Power App", tier: "platform", x: 11, y: 82, icon: "platform-tier", detail: "Staff select the active mode, enable devices, switch Game Mode on or off and manage prize inventory. These actions call the Function APIs. Exploring this map never changes the physical mode." },
  { id: "data", label: "Dataverse", subtitle: "State & prizes", tier: "platform", x: 30.5, y: 82, icon: "dataverse", detail: "Stores active game-box state, device profiles, real telemetry events, game wins and prize inventory. The Function App performs the backend reads and writes." },
  { id: "pages", label: "Power Pages", subtitle: "Live kiosk", tier: "platform", x: 50, y: 82, icon: "pages", detail: "Displays the selected instrument using live panel readings. When the required configuration is restored, Game Mode ON creates a win and shows a prize QR; Game Mode OFF shows a local success message. Help Fix requests concise troubleshooting guidance." },
  { id: "agent", label: "Copilot Studio", subtitle: "Help Fix agent", tier: "platform", x: 69.5, y: 82, icon: "copilot", detail: "Help Fix sends current and required controls to the agent through Direct Line, using a short-lived token from the Function App. Static mode instructions are the fallback when the agent is unavailable." },
  { id: "prize", label: "Prize wheel", subtitle: "Player phone", tier: "platform", x: 89, y: 82, icon: "pages", detail: "The player scans the kiosk QR to open the separate prize-wheel site. Its claim token goes to the Function APIs, which validate the win and award a prize from Dataverse inventory." },
];
export const MAP_LINKS = [
  { from: "inputs", to: "pi", label: "GPIO inputs" }, { from: "pi", to: "lamps", label: "GPIO outputs" },
  { from: "pi", to: "hub", label: "Panel telemetry" }, { from: "hub", to: "events", label: "Event routing" },
  { from: "events", to: "functions", label: "Event trigger" }, { from: "functions", to: "signalr", label: "Broadcast events" },
  { from: "signalr", to: "pages", label: "Live readings & mode updates" },
  { from: "pi", to: "functions", label: "Poll selected mode" },
  { from: "control", to: "functions", label: "Staff mode & prize APIs" },
  { from: "functions", to: "data", label: "Read / write game data" },
  { from: "pages", to: "functions", label: "State, agent token, win & rotation APIs" },
  { from: "pages", to: "agent", label: "Direct Line troubleshooting" },
  { from: "pages", to: "prize", label: "Scan win QR" },
  { from: "prize", to: "functions", label: "Prize list & claim APIs" },
];
