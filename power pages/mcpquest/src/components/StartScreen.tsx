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
}

const NICKNAME_PATTERN = /^[A-Za-z0-9 _.-]{3,12}$/;

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
}: Props) {
  const [nickname, setNickname] = useState(initialNickname);
  const trimmed = nickname.trim();
  const valid = NICKNAME_PATTERN.test(trimmed);
  const mode = findMission(modeSlug);

  return (
    <div className="start-grid">
      <section className="card hero">
        <p className="eyebrow">Single play · scored</p>
        <h2>Interrogate the system. Find the facts. Beat the clock.</h2>
        <p>
          You get a live service desk. Query it with real tools to find out what is going on, then submit
          once. Faster, cleaner runs score higher.
        </p>

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

        {onSelectServer ? (
          <ServerPicker
            servers={servers ?? null}
            error={serverError ?? null}
            selected={selectedServer}
            disabled={busy}
            onSelect={onSelectServer}
          />
        ) : null}

        <ul className="rules">
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
        </ul>

        <form
          className="start-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid && !busy) onStart(trimmed);
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
            <button type="submit" className="primary" disabled={!valid || busy}>
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
        {isPreview ? (
          <p className="preview-note">
            Test mode: scoring runs in this browser and scores are not prize-eligible.
          </p>
        ) : null}
      </section>

      <section className="card">
        <h2>High scores</h2>
        <p className="muted">{mode.title}</p>
        <Leaderboard entries={leaderboard} error={leaderboardError} />
      </section>
    </div>
  );
}
