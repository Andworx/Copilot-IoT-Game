import "../styles/drone-ground.css";

/** A completion illustration only: never sends flight commands. */
export function DroneTakeoff() {
  return <figure className="drone-takeoff" aria-label="Simulated drone takeoff celebration">
    <figcaption>SIMULATED TAKEOFF</figcaption>
    <svg viewBox="0 0 320 260" role="img" aria-label="Drone lifting off a landing pad">
      <path className="takeoff-grid" d="M0 235H320 M0 210H320 M0 190H320 M160 165L30 260 M160 165L290 260 M160 165V260"/>
      <ellipse className="takeoff-pad" cx="160" cy="223" rx="90" ry="22"/>
      <path className="takeoff-pad" d="M140 215V231 M180 215V231 M140 223H180"/>
      <ellipse className="drone-shadow" cx="160" cy="219" rx="44" ry="8"/>
      <g className="takeoff-aircraft">
        <path className="drone-arms" d="M154 196L102 180 M166 196L218 180 M150 198L115 205 M170 198L205 205"/>
        <g className="drone-rotors">{[[102,177],[218,177],[115,202],[205,202]].map(([x,y]) => <ellipse key={x} cx={x} cy={y} rx="26" ry="5"/>)}</g>
        <path className="drone-body" d="M140 184L180 184L185 201L168 210H152L135 201Z"/>
        <path className="drone-legs" d="M145 204L139 215 M175 204L181 215"/>
        <circle className="drone-camera" cx="160" cy="203" r="4"/>
      </g>
    </svg>
    <span>Flight ops ready</span>
  </figure>;
}
