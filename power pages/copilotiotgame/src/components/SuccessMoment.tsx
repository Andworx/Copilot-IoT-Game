import type { ReactNode } from "react";
import { DroneTakeoff } from "./DroneTakeoff";
import "../styles/success-moments.css";

interface SuccessMomentProps {
  deviceSlug: string;
}

interface MomentCopy {
  caption: string;
  status: string;
  label: string;
}

/** Per-device overlay copy; label doubles as the accessible name. Illustration only: never sends commands. */
const moments: Record<string, MomentCopy> = {
  thermostat: { caption: "SIMULATED HEAT CYCLE", status: "Temperature holding steady", label: "Thermostat holding its target temperature" },
  "smart-lock": { caption: "SIMULATED UNLOCK", status: "Secure door ready", label: "Smart lock shackle opening" },
  "coldchain-sensor": { caption: "SIMULATED COLD CHAIN", status: "Telemetry back in range", label: "Cold-chain temperature trace settling in range" },
  "water-pump": { caption: "SIMULATED PUMP RUN", status: "Flow restored", label: "Pump moving water into a filling tank" },
  "field-radio": { caption: "SIMULATED TRANSMISSION", status: "Secure link established", label: "Field radio broadcasting a secure signal" },
  "ev-charger": { caption: "SIMULATED CHARGE", status: "Power flowing", label: "EV charger filling a vehicle battery" },
  elevator: { caption: "SIMULATED SERVICE RUN", status: "Car back in service", label: "Elevator car arriving and opening its doors" },
  "traffic-signal": { caption: "SIMULATED SIGNAL CYCLE", status: "Cycle restored", label: "Traffic signal cycling through to green" },
  "patient-monitor": { caption: "SIMULATED VITALS", status: "Vitals stabilized", label: "Patient monitor showing a steady heartbeat" },
  "retail-kiosk": { caption: "SIMULATED TEST RECEIPT", status: "Terminal ready, no payment taken", label: "Payment terminal printing a test receipt" },
  "industrial-robot-arm": { caption: "SIMULATED HOMING", status: "Arm at ready position", label: "Robot arm returning to its ready position" },
};

const fallback: MomentCopy = { caption: "SIMULATED RECOVERY", status: "Device restored", label: "Device restored" };

/** Same hologram stage as the drone takeoff: perspective grid, glowing pad, shadow, then the device scene. */
export function SuccessMoment({ deviceSlug }: SuccessMomentProps) {
  if (deviceSlug === "drone-ground-control") return <DroneTakeoff />;

  const copy = moments[deviceSlug] ?? fallback;

  return (
    <figure className="success-moment" data-success-device={deviceSlug} aria-label={copy.label}>
      <figcaption>{copy.caption}</figcaption>
      <svg viewBox="0 0 320 260" role="img" aria-label={copy.label}>
        <path className="sm-grid" d="M0 235H320 M0 210H320 M0 190H320 M160 165L30 260 M160 165L290 260 M160 165V260" />
        <ellipse className="sm-pad" cx="160" cy="225" rx="96" ry="21" />
        <ellipse className="sm-pad-ring" cx="160" cy="225" rx="70" ry="14" />
        <ellipse className="sm-shadow" cx="160" cy="223" rx="52" ry="8" />
        <DeviceScene deviceSlug={deviceSlug} />
      </svg>
      <span>{copy.status}</span>
    </figure>
  );
}

const Check = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className="sm-stamp">
      <circle className="sm-led" r="11" />
      <path className="sm-check" d="M-5 0L-1 4L6 -4" />
    </g>
  </g>
);

function DeviceScene({ deviceSlug }: SuccessMomentProps): ReactNode {
  switch (deviceSlug) {
    case "thermostat":
      return (
        <g className="sm-thermo">
          <circle className="sm-halo" cx="160" cy="116" r="84" />
          <circle className="sm-body" cx="160" cy="116" r="76" />
          <circle className="sm-bezel" cx="160" cy="116" r="64" />
          <circle className="sm-track" cx="160" cy="116" r="54" />
          <circle className="sm-arc" cx="160" cy="116" r="54" pathLength="100" transform="rotate(-90 160 116)" />
          <path className="sm-ticks" d="M160 52V58 M215 77L211 81 M236 116H230 M215 155L211 151 M160 180V174 M105 155L109 151 M84 116H90 M105 77L109 81" />
          <text className="sm-readout" x="160" y="126" textAnchor="middle">21°</text>
          <text className="sm-sub" x="160" y="146" textAnchor="middle">HOLDING</text>
          <path className="sm-spark sm-s1" d="M92 52L102 64" />
          <path className="sm-spark sm-s2" d="M228 52L218 64" />
          <path className="sm-spark sm-s3" d="M160 24V38" />
        </g>
      );
    case "smart-lock":
      return (
        <g className="sm-lock">
          <circle className="sm-pulse" cx="160" cy="146" r="30" />
          <circle className="sm-pulse late" cx="160" cy="146" r="30" />
          <path className="sm-shackle" d="M132 112V88C132 54 188 54 188 88V112" />
          <rect className="sm-body" x="108" y="108" width="104" height="96" rx="12" />
          <rect className="sm-bezel" x="116" y="116" width="88" height="80" rx="8" />
          <circle className="sm-led" cx="160" cy="146" r="14" />
          <path className="sm-keyhole" d="M160 142V152 M154 150H166" />
          <path className="sm-keyhole" d="M153 168H167" />
          <circle className="sm-led-dot" cx="196" cy="124" r="4" />
        </g>
      );
    case "coldchain-sensor":
      return (
        <g className="sm-cold">
          <rect className="sm-body" x="76" y="50" width="168" height="124" rx="10" />
          <rect className="sm-band" x="88" y="96" width="144" height="40" rx="3" />
          <path className="sm-ticks" d="M88 76H232 M88 156H232" />
          <text className="sm-sub" x="94" y="90">8°C</text>
          <text className="sm-sub" x="94" y="150">2°C</text>
          <path className="sm-trace" pathLength="100" d="M90 70L108 64L122 148L136 74L150 142L164 88L178 128L194 108L210 116L230 114" />
          <circle className="sm-trace-dot" cx="230" cy="114" r="6" />
          <path className="sm-flake" d="M160 186V210 M149 192L171 204 M171 192L149 204" />
          <rect className="sm-bezel" x="126" y="184" width="68" height="26" rx="6" />
          <circle className="sm-led-dot" cx="140" cy="197" r="3.5" />
          <text className="sm-sub in-range" x="150" y="200">IN RANGE</text>
        </g>
      );
    case "water-pump":
      return (
        <g className="sm-pump">
          <rect className="sm-body" x="222" y="64" width="52" height="108" rx="8" />
          <clipPath id="sm-tank-clip"><rect x="226" y="68" width="44" height="100" rx="5" /></clipPath>
          <g clipPath="url(#sm-tank-clip)"><rect className="sm-water" x="226" y="68" width="44" height="100" /><path className="sm-wave" d="M222 70Q232 64 242 70T262 70T282 70V74H222Z" /></g>
          <path className="sm-pipe" d="M56 146H128 M192 146H222" />
          <path className="sm-flow" d="M56 146H128 M192 146H222" />
          <circle className="sm-body" cx="160" cy="146" r="38" />
          <circle className="sm-bezel" cx="160" cy="146" r="30" />
          <g className="sm-impeller"><path d="M160 146L160 120 M160 146L186 146 M160 146L160 172 M160 146L134 146" /></g>
          <circle className="sm-led" cx="160" cy="146" r="7" />
          <path className="sm-drop" d="M240 38C246 48 250 54 250 59A10 10 0 1 1 230 59C230 54 234 48 240 38Z" />
        </g>
      );
    case "field-radio":
      return (
        <g className="sm-radio">
          <path className="sm-wavearc w1" d="M164 74C186 66 200 54 200 38" />
          <path className="sm-wavearc w2" d="M164 88C204 76 230 56 230 28" />
          <path className="sm-wavearc w3" d="M164 102C220 86 258 58 258 18" />
          <rect className="sm-bezel" x="130" y="56" width="9" height="52" rx="4" />
          <circle className="sm-led" cx="134.500" cy="54" r="5" />
          <rect className="sm-body" x="108" y="100" width="96" height="116" rx="14" />
          <rect className="sm-screen" x="120" y="112" width="72" height="32" rx="5" />
          <text className="sm-sub" x="128" y="126">CH 07</text>
          <text className="sm-sub" x="128" y="138">SECURE</text>
          <path className="sm-bars" d="M168 138V132 M175 138V127 M182 138V121" />
          <path className="sm-ticks" d="M122 160H190 M122 170H190 M122 180H190" />
          <circle className="sm-bezel" cx="186" cy="200" r="7" />
        </g>
      );
    case "ev-charger":
      return (
        <g className="sm-ev">
          <rect className="sm-body" x="84" y="56" width="62" height="152" rx="10" />
          <rect className="sm-screen" x="94" y="68" width="42" height="34" rx="4" />
          <text className="sm-sub" x="115" y="90" textAnchor="middle">FULL</text>
          <path className="sm-bolt" d="M120 118L103 144H116L110 168L132 138H119Z" />
          <path className="sm-cable" d="M146 132C172 132 160 184 186 188" />
          <rect className="sm-battery" x="176" y="64" width="104" height="38" rx="6" />
          <rect className="sm-cell c1" x="184" y="72" width="16" height="22" rx="2" />
          <rect className="sm-cell c2" x="204" y="72" width="16" height="22" rx="2" />
          <rect className="sm-cell c3" x="224" y="72" width="16" height="22" rx="2" />
          <rect className="sm-cell c4" x="244" y="72" width="16" height="22" rx="2" />
          <path className="sm-cap" d="M280 76V90" />
          <path className="sm-carbody" d="M170 208V186Q170 176 182 174L204 150H252L274 174Q292 176 292 190V208Z" />
          <path className="sm-window" d="M210 154H248L262 172H196Z" />
          <circle className="sm-wheel" cx="200" cy="208" r="13" />
          <circle className="sm-wheel" cx="266" cy="208" r="13" />
        </g>
      );
    case "elevator":
      return (
        <g className="sm-lift">
          <rect className="sm-body" x="92" y="40" width="136" height="180" rx="8" />
          <rect className="sm-shaft" x="104" y="64" width="112" height="148" />
          <path className="sm-ticks" d="M104 100H216 M104 136H216 M104 172H216" />
          <rect className="sm-screen" x="136" y="46" width="48" height="14" rx="3" />
          <text className="sm-sub" x="160" y="57" textAnchor="middle">▲ L3</text>
          <g className="sm-cabin">
            <rect className="sm-cab-inner" x="112" y="104" width="96" height="100" rx="3" />
            <clipPath id="sm-cab-clip"><rect x="112" y="104" width="96" height="100" /></clipPath>
            <g clipPath="url(#sm-cab-clip)">
              <rect className="sm-door left" x="112" y="104" width="48" height="100" />
              <rect className="sm-door right" x="160" y="104" width="48" height="100" />
            </g>
          </g>
          <path className="sm-spark sm-s1" d="M148 92L160 80L172 92" />
        </g>
      );
    case "traffic-signal":
      return (
        <g className="sm-traffic">
          <path className="sm-cross" d="M70 236H110 M70 226H110 M70 216H110 M210 236H250 M210 226H250 M210 216H250" />
          <rect className="sm-body" x="130" y="34" width="60" height="140" rx="12" />
          <rect className="sm-bezel" x="138" y="42" width="44" height="124" rx="8" />
          <circle className="sm-lamp red" cx="160" cy="68" r="17" />
          <circle className="sm-lamp amber" cx="160" cy="104" r="17" />
          <circle className="sm-lamp green" cx="160" cy="140" r="17" />
          <rect className="sm-bezel" x="154" y="174" width="12" height="40" />
          <circle className="sm-green-halo" cx="160" cy="140" r="28" />
        </g>
      );
    case "patient-monitor":
      return (
        <g className="sm-patient">
          <rect className="sm-body" x="62" y="46" width="196" height="132" rx="12" />
          <rect className="sm-screen" x="72" y="56" width="176" height="112" rx="6" />
          <path className="sm-ticks" d="M72 112H248 M130 56V168 M190 56V168" />
          <path className="sm-trace pulse" pathLength="100" d="M80 120H112L122 100L134 142L146 82L158 124L168 120H196L206 104L216 128L226 120H240" />
          <text className="sm-readout small" x="82" y="86">72</text>
          <text className="sm-sub" x="112" y="86">BPM</text>
          <text className="sm-sub" x="82" y="158">SpO₂ 98%</text>
          <path className="sm-heart" d="M224 74C228 66 238 68 238 76C238 84 228 90 224 94C220 90 210 84 210 76C210 68 220 66 224 74Z" />
          <path className="sm-bezel" d="M146 178L134 206H186L174 178" />
        </g>
      );
    case "retail-kiosk":
      return (
        <g className="sm-retail">
          <rect className="sm-body" x="86" y="30" width="148" height="52" rx="10" />
          <rect className="sm-screen" x="96" y="38" width="64" height="22" rx="3" />
          <text className="sm-sub" x="128" y="53" textAnchor="middle">COMPLETE</text>
          <circle className="sm-led-dot" cx="218" cy="46" r="4" />
          <path className="sm-ticks" d="M170 46H206 M170 54H196" />
          <rect className="sm-slot" x="102" y="72" width="116" height="7" rx="3" />
          <clipPath id="sm-receipt-clip"><rect x="90" y="78" width="140" height="140" /></clipPath>
          <g clipPath="url(#sm-receipt-clip)">
            <g className="sm-receipt">
              <path className="sm-paper" d="M106 0H214V132L206 126L198 132L190 126L182 132L174 126L166 132L158 126L150 132L142 126L134 132L126 126L118 132L110 126L106 132Z" transform="translate(0 78)" />
              <g className="sm-paper-text">
                <text x="160" y="100" textAnchor="middle" className="head">SIMULATED TEST RECEIPT</text>
                <path className="sm-dash" d="M114 107H206" />
                <text x="116" y="120">READER</text><text x="204" y="120" textAnchor="end">OK</text>
                <text x="116" y="133">NETWORK</text><text x="204" y="133" textAnchor="end">OK</text>
                <text x="116" y="146">PRINTER</text><text x="204" y="146" textAnchor="end">OK</text>
                <path className="sm-dash" d="M114 153H206" />
                <text x="160" y="167" textAnchor="middle" className="head">NO PAYMENT TAKEN</text>
              </g>
              <Check x={160} y={188} s={0.9} />
            </g>
          </g>
        </g>
      );
    case "industrial-robot-arm":
      return (
        <g className="sm-robot">
          <path className="sm-sweep" d="M105 190A110 110 0 0 1 215 80" />
          <rect className="sm-body" x="62" y="196" width="86" height="22" rx="6" />
          <rect className="sm-bezel" x="90" y="170" width="30" height="28" rx="4" />
          <g className="sm-arm-one">
            <path className="sm-link" d="M105 180L165 120" />
            <g className="sm-arm-two">
              <path className="sm-link" d="M165 120L226 152" />
              <path className="sm-grip" d="M226 152L242 140 M226 152L244 160" />
              <rect className="sm-cube" x="240" y="143" width="16" height="16" rx="2" />
            </g>
            <circle className="sm-led" cx="165" cy="120" r="10" />
          </g>
          <circle className="sm-led" cx="105" cy="182" r="12" />
          <Check x={252} y={92} s={0.9} />
        </g>
      );
    default:
      return (
        <g>
          <circle className="sm-halo" cx="160" cy="120" r="64" />
          <circle className="sm-body" cx="160" cy="120" r="56" />
          <path className="sm-check big" d="M130 122L152 144L194 96" />
        </g>
      );
  }
}
