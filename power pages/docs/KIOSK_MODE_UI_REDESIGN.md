# Kiosk Mode UI Redesign Notes

Issue: #73 (epic); foundation #75 / #76; thermostat pilot #77.

## Implemented foundation

`src/components/surfaces/registry.tsx` selects a read-only surface via
`DeviceProfile.surfaceKind`. The remaining legacy layouts are transitional adapters;
`device.instruments` explicitly binds their dial, gauge, guards, button, and signal.
Array order only arranges independent controls and never defines instrument meaning.
The `PanelSurfaceProps` contract includes state, semantic lamps, completion, connection
freshness, and all ten physical control mappings. There is no mutation callback.
`PanelSurface` owns the connection banner, semantic status strip, and physical-input
rail; `KioskDevicePage` continues to own Help Fix, telemetry, completion, and prizes.

`npm test` compares all 12,288 Boolean configurations with the Pi logic maps, checks
physical labels/keys/targets, and rejects unknown instrument/lamp bindings. This runs
before production builds. Restore sequence order is guidance only: win detection checks
the final configuration, not temporal action order. No Pi win rules changed.

Run Vite and open `/tests/surface-preview.html?mode=thermostat&state=partial` for an
isolated fixture. States: fault, partial, restored, stale, waiting. This development-only
entry is excluded from the production build and does not call completion endpoints.
No measured temperatures, pressures, vitals, or signal levels are inferred from Boolean
switches. Stale status is explicit and activity animations pause; reduced motion disables
instrument animation.

The twelve surfaces are migration destinations, not a claim that all twelve dedicated
UIs have shipped. The thermostat is the first pilot; the other eleven retain adapters.


The current kiosk implementation uses five reusable panel layouts with per-device skinning. That made the first build efficient, but the modes now read too similarly. The next iteration should keep the shared kiosk shell and telemetry contracts, while replacing the five shared layouts with twelve mode-specific instrument surfaces.

## Architecture Direction

Keep `KioskDevicePage` responsible for route state, telemetry, win detection, Help Fix, overlays, semantic lamp colors, and physical-panel-only interaction. Move the visible controls into a `surfaceKind` registry so each mode can render a distinct real-world instrument.

Suggested model:

```ts
type SurfaceKind =
  | "hvac-thermostat"
  | "security-door-panel"
  | "coldchain-logger"
  | "pump-scada"
  | "field-radio"
  | "ev-charge-pedestal"
  | "elevator-service"
  | "traffic-cabinet"
  | "patient-monitor"
  | "payment-terminal"
  | "drone-ground-station"
  | "robot-teach-pendant";
```

Each surface should receive the same data contract:

```ts
interface PanelSurfaceProps {
  device: DeviceProfile;
  state: DeviceState;
  lampColors: Record<string, LampColor>;
  win: boolean;
  controls: readonly RestoreStep[];
  connection: { isLive: boolean; ageSeconds: number | null };
}
```

Reusable primitives should support, not flatten, the mode differences: `Gauge`, `MiniTrendChart`, `SignalBars`, `ProcessPipe`, `FloorStack`, `PhaseTimer`, `VitalWaveform`, `CableFlow`, `RadarScope`, and `InterlockDiagram`.

## Mode Concepts

| Mode | Control-panel metaphor | Distinct UI treatment |
|---|---|---|
| Smart Thermostat | Residential HVAC thermostat faceplate | Large temperature/setpoint ring, fan-blade indicator, heat/cool mode tabs, room-temp readout, warm calm motion. |
| Smart Lock & Security Panel | Alarm keypad plus door-state schematic | 3x3 keypad, door outline, sliding bolt animation, shield/tamper badge, battery strip. |
| Cold-Chain Warehouse Sensor | Refrigerated logistics data logger | Wide temperature strip chart, probe icon, min/max threshold rails, sync beacon, calibration switch bank. |
| Water Pump Station Controller | Municipal pump SCADA panel | Pipe flow diagram, pressure gauge, valve wheel, pump impeller, tank-level column. |
| Tactical Field Radio | Rugged field transceiver | Frequency window, large tuning knob, guarded transmit switch, squelch meter, encryption key slot. |
| Smart EV Charger | Public charging pedestal | Charger silhouette, cable path, plug latch indicator, kW meter, breaker reset tab, payment/session badge. |
| Elevator Control Panel | Machine-room service panel | Vertical floor stack, car-position block, door interlock bar, inspection key area, brake release status. |
| Traffic Signal Controller | Roadside signal cabinet | Top-down intersection mini-map, red/yellow/green heads, pedestrian call box, phase timer wheel. |
| Hospital Patient Monitor | Bedside vitals monitor | ECG waveform, heart-rate numerals, SpO2 tile, lead-off body silhouette, alarm strip. |
| Retail Payment Kiosk | POS terminal/card reader | Card slot/contactless target, receipt printer strip, auth timeline, approved/declined mini-display. |
| Drone Ground Control | Ground-control station HUD | Radar/map scope, altitude ladder, satellite acquisition dots, uplink/downlink bars, return-home path. |
| Industrial Robot Arm | Robot teach pendant / cell safety HMI | Robot arm joint diagram, servo enable rail, guard-door interlock, E-stop reset block, teach/run badge. |

## Implementation Notes

- Do not rely on color/theme alone for uniqueness; each mode needs a different spatial model.
- Preserve physical-panel-only state updates. Screen controls remain disabled/read-only unless a deliberate demo mode is added later.
- Preserve semantic lamp colors: green, amber, and red still mean good, caution, and fault across all modes.
- Motion must reflect real state and respect `prefers-reduced-motion`.
- Text labels, status copy, and lamp labels must remain available so decorative diagrams do not become the only way to understand state.

## Suggested Sequence

1. Add `surfaceKind` to `DeviceProfile` and map the current layouts to equivalent surface components without behavior changes.
2. Build three high-contrast pilot surfaces: thermostat, water pump, and patient monitor.
3. Validate the 800x480 Pi screen readability and physical panel telemetry flow.
4. Replace the remaining modes in small PRs, grouped by complexity.
