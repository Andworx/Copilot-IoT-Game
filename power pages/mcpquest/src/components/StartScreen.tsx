import { useState } from "react";
import type { LeaderboardEntry, ServerOption } from "@mcpquest/types";
import { MISSIONS, findMission } from "@mcpquest/missions";
import { Leaderboard } from "./Leaderboard";
import { ServerPicker } from "./ServerPicker";

interface Props {
  isPreview: boolean;
  busy: boolean;
  error: string | null;
  leaderboard: LeaderboardEntry[] | null;
  leaderboardError: string | null;
  initialNickname: string;
  modeSlug: string;
  onModeChange: (slug: string) => void;
  onStart: (nickname: string) => void;
  /** Systems a mission can be built from. Left out on backends that only serve fixed missions. */
  servers?: ServerOption[] | null;
  serverError?: string | null;
  selectedServer?: string | null;
  onSelectServer?: (slug: string | null) => void;
  /** Show the fixed missions even where systems can be built from (an operator link: `?mode=`). */
  showClassic?: boolean;
}

const NICKNAME_PATTERN = /^[A-Za-z0-9 _.-]{3,12}$/;

const MAP_SPOTS = [
  { x: 12, y: 22 },
  { x: 34, y: 14 },
  { x: 56, y: 20 },
  { x: 78, y: 16 },
  { x: 20, y: 45 },
  { x: 44, y: 42 },
  { x: 68, y: 45 },
  { x: 86, y: 40 },
  { x: 14, y: 68 },
  { x: 38, y: 66 },
  { x: 60, y: 70 },
  { x: 82, y: 64 },
  { x: 28, y: 84 },
  { x: 52, y: 84 },
  { x: 74, y: 82 },
] as const;

export function StartScreen({
  isPreview,
  busy,
  error,
  leaderboard,
  leaderboardError,
  initialNickname,
  modeSlug,
  onModeChange,
  onStart,
  servers,
  serverError,
  selectedServer = null,
  onSelectServer,
  showClassic = false,
}: Props) {
  const [nickname, setNickname] = useState(initialNickname);
  const trimmed = nickname.trim();
  const valid = NICKNAME_PATTERN.test(trimmed);
  const mode = findMission(modeSlug);

  // Where systems can be built from, the visitor only chooses a system. The fixed missions come
  // back if the list of systems cannot be loaded (so there is still something to play), or when
  // an operator asks for them with `?mode=`, and are always there on backends with no systems.
  const buildOnly = Boolean(onSelectServer) && !showClassic && !serverError;
  const ready = valid && !busy && (!buildOnly || selectedServer !== null);
  const classic = !buildOnly;
  const systemOptions = servers ?? [];
  const selectedSystem = systemOptions.find((s) => s.slug === selectedServer) ?? null;
  const selectedIndex = Math.max(0, systemOptions.findIndex((s) => s.slug === selectedServer));
  const avatarSpot = selectedServer ? (MAP_SPOTS[selectedIndex % MAP_SPOTS.length] ?? MAP_SPOTS[0]) : { x: 5, y: 84 };

  return (
    <div className={buildOnly ? "start-grid start-grid-build" : "start-grid"}>
      <section className={buildOnly ? "card hero quest-home" : "card hero"}>
        <p className="eyebrow">Single play · scored</p>
        {buildOnly ? null : (
          <>
            <h2>Interrogate the system. Find the facts. Beat the clock.</h2>
            <p>
              You get a live service desk. Query it with real tools to find out what is going on, then submit
              once. Faster, cleaner runs score higher.
            </p>
          </>
        )}

        {classic ? (
          <fieldset className="mode-picker">
            <legend>Choose your mission</legend>
            {MISSIONS.map((m) => (
              <label key={m.slug} className={m.slug === modeSlug && !selectedServer ? "mode active" : "mode"}>
                <input
                  type="radio"
                  name="mode"
                  checked={m.slug === modeSlug && !selectedServer}
                  onChange={() => {
                    onSelectServer?.(null);
                    onModeChange(m.slug);
                  }}
                  disabled={busy}
                />
                <span>
                  <strong>{m.title}</strong>
                  <span className="cap-desc">{m.tagline}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : null}

        {buildOnly && onSelectServer ? (
          <form
            className="quest-map-layout"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) onStart(trimmed);
            }}
          >
            <div className="quest-dialog">
              <span>Sage</span>
              <h2>Choose your mission. I will forge the quest.</h2>
              <p>
                Every marker hides a different set of tools. Pick one from the realm below, enter your player name,
                and I will build a Power Platform quest from what that mission can actually do.
              </p>
            </div>
            <fieldset className="quest-map-picker">
              <legend>Mission map</legend>
              {serverError ? (
                <p className="muted" role="status">
                  {serverError}
                </p>
              ) : !servers ? (
                <p className="muted" role="status">
                  Charting the realm...
                </p>
              ) : systemOptions.length === 0 ? (
                <p className="muted">No missions are available right now.</p>
              ) : (
                <div
                  className="quest-map-stage"
                  style={{ ["--avatar-x" as string]: `${avatarSpot.x}%`, ["--avatar-y" as string]: `${avatarSpot.y}%` }}
                >
                  <div className="quest-map-paths" aria-hidden="true" />
                  <div className="quest-map-avatar" aria-hidden="true">
                    <span />
                  </div>
                  {systemOptions.map((s, index) => {
                    const spot = MAP_SPOTS[index % MAP_SPOTS.length] ?? MAP_SPOTS[0];
                    return (
                      <label
                        key={s.slug}
                        className={s.slug === selectedServer ? "quest-map-node is-active" : "quest-map-node"}
                        title={s.description}
                        style={{ ["--node-x" as string]: `${spot.x}%`, ["--node-y" as string]: `${spot.y}%` }}
                      >
                        <input
                          type="radio"
                          name="server"
                          checked={s.slug === selectedServer}
                          onChange={() => onSelectServer(s.slug)}
                          disabled={busy}
                        />
                        <span>{index + 1}</span>
                        <strong>{s.name}</strong>
                      </label>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <div className="quest-map-index" aria-label="Mission names">
              {systemOptions.map((system, index) => (
                <button
                  key={system.slug}
                  type="button"
                  aria-pressed={system.slug === selectedServer}
                  disabled={busy}
                  onClick={() => onSelectServer(system.slug)}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  {system.name}
                </button>
              ))}
            </div>

            <aside className="quest-map-panel" aria-live="polite">
              <span>Selected mission</span>
              <strong>{selectedSystem ? selectedSystem.name : "Choose a mission"}</strong>
              <p>
                {selectedSystem
                  ? `${selectedSystem.toolCount || "Several"} tools will shape this mission. Press Start when your avatar reaches the marker.`
                  : "Pick a numbered mission marker on the map. Your avatar will walk to it before the mission begins."}
              </p>
              <label htmlFor="nickname">Player name</label>
              <input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={12}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="3–12 letters or numbers"
                aria-describedby="nickname-help"
              />
              <p id="nickname-help" className="muted">
                Use a nickname, not your real name or email.
              </p>
              {error ? (
                <p className="error" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" className="primary" disabled={!ready}>
                {busy ? "Starting…" : selectedServer ? "Start mission" : "Choose a mission"}
              </button>
            </aside>
          </form>
        ) : onSelectServer ? (
          <ServerPicker
            servers={servers ?? null}
            error={serverError ?? null}
            selected={selectedServer}
            disabled={busy}
            onSelect={onSelectServer}
            heading={buildOnly ? "Systems of the realm" : "Or build a mission from a system"}
          />
        ) : null}

        {!buildOnly ? (
          <ul className="rules">
            <>
              <li>
                {mode.slug === "fixit"
                  ? "Your tests run against a live service desk through MCP. The data is real; writes are simulated."
                  : "The tools are read-only: looking things up never changes any data."}
              </li>
              <li>
                {mode.slug === "fixit"
                  ? "Wrong tool choices and hints cost points. Test as often as you need within the limit."
                  : "Extra tool calls and hints cost points. Wrong answers earn nothing."}
              </li>
              <li>
                {mode.slug === "fixit"
                  ? "Get every fix right and score high enough to win a prize."
                  : "Answer everything correctly with a high enough score to win a prize."}
              </li>
            </>
          </ul>
        ) : null}

        {!buildOnly ? (
          <form
            className="start-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) onStart(trimmed);
            }}
          >
            <label htmlFor="nickname">Your player name (shown on the board)</label>
            <div className="start-row">
              <input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={12}
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="3–12 letters or numbers"
                aria-describedby="nickname-help"
              />
              <button type="submit" className="primary" disabled={!ready}>
                {busy ? "Starting…" : selectedServer ? "Build my mission" : "Start"}
              </button>
            </div>
            <p id="nickname-help" className="muted">
              Use a nickname, not your real name or email. Contact details are only asked for if you win.
            </p>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        ) : null}
        {isPreview ? (
          <p className="preview-note">
            Test mode: scoring runs in this browser and scores are not prize-eligible.
          </p>
        ) : null}
      </section>

      {buildOnly ? null : (
        <section className="card">
          <h2>High scores</h2>
          <p className="muted">{mode.title}</p>
          <Leaderboard entries={leaderboard} error={leaderboardError} />
        </section>
      )}
    </div>
  );
}
