import { DroneTakeoff } from "./DroneTakeoff";
import "../styles/success-moments.css";

interface SuccessMomentProps {
  deviceSlug: string;
}

const visualLabels: Record<string, string> = {
  thermostat: "Temperature holding steady",
  "smart-lock": "Secure door unlocked to ready state",
  "coldchain-sensor": "Cold-chain telemetry stabilized",
  "water-pump": "Pump flow restored",
  "field-radio": "Secure field radio signal established",
  "ev-charger": "EV charger power flowing",
  elevator: "Elevator car returned to service",
  "traffic-signal": "Traffic signal cycle restored",
  "patient-monitor": "Patient monitor vitals stabilized",
  "retail-kiosk": "Retail payment terminal ready",
  "industrial-robot-arm": "Robot arm returned to ready position",
};

export function SuccessMoment({ deviceSlug }: SuccessMomentProps) {
  if (deviceSlug === "drone-ground-control") return <DroneTakeoff />;

  const label = visualLabels[deviceSlug] ?? "Device restored";

  return (
    <figure className="success-moment" data-success-device={deviceSlug} aria-label={label}>
      <svg viewBox="0 0 320 240" role="img" aria-label={label}>
        <path className="success-grid" d="M30 196H290 M46 164H274 M66 132H254 M96 100H224 M160 52V212 M110 72L50 212 M210 72L270 212" />
        <DeviceSuccessGlyph deviceSlug={deviceSlug} />
      </svg>
    </figure>
  );
}

function DeviceSuccessGlyph({ deviceSlug }: SuccessMomentProps) {
  switch (deviceSlug) {
    case "thermostat":
      return (
        <g className="success-thermostat">
          <circle className="success-ring" cx="160" cy="118" r="66" />
          <circle className="success-ring inner" cx="160" cy="118" r="42" />
          <path className="success-primary" d="M160 76V118L190 140" />
          <path className="success-spark spark-one" d="M91 65L103 82" />
          <path className="success-spark spark-two" d="M225 66L211 84" />
          <path className="success-spark spark-three" d="M160 24V48" />
        </g>
      );
    case "smart-lock":
      return (
        <g className="success-lock">
          <path className="success-outline" d="M109 106H211V184H109Z" />
          <path className="success-primary" d="M132 106V82C132 49 188 49 188 82" />
          <path className="success-primary unlock" d="M188 82C188 63 205 54 219 64" />
          <circle className="success-fill" cx="160" cy="141" r="12" />
          <path className="success-fill" d="M156 150H164L168 171H152Z" />
        </g>
      );
    case "coldchain-sensor":
      return (
        <g className="success-coldchain">
          <path className="success-outline" d="M96 93L160 58L224 93V165L160 200L96 165Z" />
          <path className="success-primary" d="M160 58V200M96 93L224 165M224 93L96 165" />
          <path className="success-spark spark-one" d="M160 82V174M119 106L201 150M201 106L119 150" />
          <circle className="success-fill" cx="160" cy="128" r="15" />
        </g>
      );
    case "water-pump":
      return (
        <g className="success-water">
          <path className="success-outline" d="M92 128C92 84 128 58 160 58C192 58 228 84 228 128C228 178 190 202 160 202C130 202 92 178 92 128Z" />
          <path className="success-primary" d="M99 150C123 126 140 160 160 138C182 113 195 151 221 126" />
          <path className="success-primary wave-two" d="M104 174C128 150 143 181 164 160C184 140 198 173 219 151" />
          <circle className="success-fill" cx="160" cy="101" r="21" />
        </g>
      );
    case "field-radio":
      return (
        <g className="success-radio">
          <path className="success-outline" d="M114 90H198L212 188H102Z" />
          <path className="success-primary" d="M133 90L112 42" />
          <path className="success-primary" d="M135 124H182M135 148H170" />
          <circle className="success-fill" cx="184" cy="154" r="15" />
          <path className="success-spark spark-one" d="M211 78C235 95 235 129 211 146" />
          <path className="success-spark spark-two" d="M230 58C266 88 266 137 230 166" />
        </g>
      );
    case "ev-charger":
      return (
        <g className="success-ev">
          <path className="success-outline" d="M107 58H193V202H107Z" />
          <path className="success-primary" d="M129 79H171V122H129Z" />
          <path className="success-fill" d="M164 128L137 166H158L150 193L182 150H160Z" />
          <path className="success-primary cable" d="M193 107C229 107 229 155 203 155H190" />
        </g>
      );
    case "elevator":
      return (
        <g className="success-elevator">
          <path className="success-outline" d="M104 49H216V203H104Z" />
          <path className="success-primary" d="M160 49V203M124 83H146M174 83H196" />
          <path className="success-fill car" d="M121 108H199V177H121Z" />
          <path className="success-spark" d="M145 91L160 76L175 91" />
        </g>
      );
    case "traffic-signal":
      return (
        <g className="success-traffic">
          <path className="success-outline" d="M128 48H192V194H128Z" />
          <circle className="success-fill red" cx="160" cy="78" r="17" />
          <circle className="success-fill amber" cx="160" cy="121" r="17" />
          <circle className="success-fill green" cx="160" cy="164" r="17" />
          <path className="success-primary" d="M160 194V218" />
        </g>
      );
    case "patient-monitor":
      return (
        <g className="success-patient">
          <path className="success-outline" d="M82 69H238V183H82Z" />
          <path className="success-primary pulse" d="M103 132H132L145 104L164 158L181 119H217" />
          <path className="success-fill" d="M132 86C144 72 160 84 160 100C160 84 176 72 188 86C202 102 184 128 160 146C136 128 118 102 132 86Z" />
        </g>
      );
    case "retail-kiosk":
      return (
        <g className="success-retail">
          <path className="success-outline" d="M99 67H221V174H99Z" />
          <path className="success-primary" d="M126 99H194M126 121H176" />
          <path className="success-fill receipt" d="M126 174H194V213L183 204L172 213L160 204L148 213L137 204L126 213Z" />
          <path className="success-primary card" d="M198 139H244V168H198Z" />
        </g>
      );
    case "industrial-robot-arm":
      return (
        <g className="success-robot">
          <circle className="success-outline" cx="105" cy="179" r="24" />
          <path className="success-primary arm-one" d="M122 163L159 111" />
          <circle className="success-fill" cx="160" cy="110" r="17" />
          <path className="success-primary arm-two" d="M174 102L218 126" />
          <path className="success-primary" d="M227 113L246 124M227 139L246 128" />
          <path className="success-outline" d="M80 203H145" />
        </g>
      );
    default:
      return (
        <g>
          <circle className="success-ring" cx="160" cy="120" r="58" />
          <path className="success-primary" d="M126 122L150 146L199 91" />
        </g>
      );
  }
}