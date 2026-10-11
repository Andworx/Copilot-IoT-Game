import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URL, MCP_SERVER_URL, resolveApiKind, resolveSpecId, resolveSpecUrl, resolveStation } from "./config";
import { initialDesignText } from "@mcpquest/specDesigns";
import { createHttpApi } from "./api/httpApi";
import { DEFAULT_MISSION, findMission } from "@mcpquest/missions";
import type {
  BuildStage,
  BuiltGame,
  CallRecord,
  GameApi,
  LeaderboardEntry,
  ServerOption,
  SessionInfo,
  SubmitResult,
} from "@mcpquest/types";
import { formatDuration } from "./format";
import { StartScreen } from "./components/StartScreen";
import { ObjectivesPanel } from "./components/ObjectivesPanel";
import { ToolWorkbench } from "./components/ToolWorkbench";
import { ResponseViewer } from "./components/ResponseViewer";
import { ResultScreen } from "./components/ResultScreen";
import { CaseWorkspace } from "./components/CaseWorkspace";
import { McpStatus } from "./components/McpStatus";
import { BuildScreen } from "./components/BuildScreen";

type Phase = "idle" | "building" | "playing" | "submitting" | "result";

const STAGE_ORDER: Record<BuildStage, number> = {
  reading: 0,
  designing: 1,
  repairing: 1,
  checking: 2,
  proving: 3,
  saving: 4,
  done: 5,
};

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

interface Apis {
  primary: GameApi;
  /** Offline simulation used when the MCP server cannot be reached. Absent in live builds. */
  preview: GameApi | null;
}

/**
 * Picks the backend. The browser-side backends contain the judge, so they are loaded on
 * demand and a build with `VITE_MCPQUEST_API=live` leaves them out of the bundle entirely:
 * the condition below is replaced at build time and the dead branch is dropped.
 */
async function loadApis(): Promise<Apis> {
  if (import.meta.env.VITE_MCPQUEST_API !== "live") {
    const specUrl = resolveSpecUrl();
    if (specUrl) {
      const { createSpecPreviewApi } = await import("./api/specPreviewApi");
      const api = createSpecPreviewApi(specUrl);
      return { primary: api, preview: null };
    }
    const kind = resolveApiKind();
    if (kind !== "live") {
      const [{ createMockApi }, { createMcpApi }] = await Promise.all([
        import("./api/mockApi"),
        import("./api/mcpWorld"),
      ]);
      const preview = createMockApi();
      return { primary: kind === "mcp" ? createMcpApi(MCP_SERVER_URL) : preview, preview };
    }
  }
  return { primary: createHttpApi(API_BASE_URL), preview: null };
}

function useElapsedSeconds(session: SessionInfo | null, running: boolean): number {
  // Offset corrects for client/server clock skew using the server's own timestamps.
  const skew = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!session) {
      setElapsed(0);
      return;
    }
    skew.current = session.serverNow - Date.now();
    const tick = () => setElapsed(Math.max(0, (Date.now() + skew.current - session.startedAt) / 1000));
    tick();
    if (!running) return;
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [session, running]);

  return elapsed;
}

export default function App() {
  const [apis, setApis] = useState<Apis | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadApis().then(
      (loaded) => {
        if (!cancelled) setApis(loaded);
      },
      (e: unknown) => {
        if (!cancelled) setLoadError(messageOf(e, "Could not load the game."));
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className="quest">
        <p className="error" role="alert">
          {loadError}
        </p>
      </div>
    );
  }
  if (!apis) {
    return (
      <div className="quest">
        <p className="muted">Loading…</p>
      </div>
    );
  }
  return <Game apis={apis} />;
}

function Game({ apis }: { apis: Apis }) {
  // The active backend. "mcp" falls back to the offline preview for one play if the MCP
  // server cannot be reached, and tries the MCP server again for the next player.
  const [api, setApi] = useState<GameApi>(apis.primary);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);
  const station = useMemo(() => resolveStation(), []);

  const [modeSlug, setModeSlug] = useState<string>(() => {
    const specId = resolveSpecId();
    if (specId) return `spec:${specId}`;
    const requested = new URLSearchParams(window.location.search).get("mode");
    return requested ? findMission(requested).slug : DEFAULT_MISSION;
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [nickname, setNickname] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hints, setHints] = useState<Record<string, string>>({});
  const [hintBusyId, setHintBusyId] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  // Building a mission from a system
  const [servers, setServers] = useState<ServerOption[] | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [buildStage, setBuildStage] = useState<BuildStage | null>(null);
  const [built, setBuilt] = useState<BuiltGame | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);

  const elapsed = useElapsedSeconds(session, phase === "playing");

  const loadBoard = useCallback(
    async (modeSlug: string) => {
      try {
        setBoardError(null);
        setBoard(await api.leaderboard(modeSlug));
      } catch (e) {
        setBoard([]);
        setBoardError(messageOf(e, "Leaderboard unavailable"));
      }
    },
    [api],
  );

  useEffect(() => {
    if (phase === "idle") void loadBoard(modeSlug);
  }, [phase, modeSlug, loadBoard]);

  const start = async (name: string, mission: string = modeSlug) => {
    setBusy(true);
    setError(null);
    try {
      let used = api;
      let next: SessionInfo;
      try {
        next = await api.start(name, station, mission);
      } catch (startError) {
        if (api.kind !== "mcp" || !apis.preview) throw startError;
        used = apis.preview;
        setFallbackNote(
          `Could not reach the MCP server (${messageOf(startError, "unknown error")}). Using the offline preview for this play.`,
        );
        next = await apis.preview.start(name, station, mission);
      }
      setApi(used);
      setNickname(name);
      setSession(next);
      // A generated game's cases start from an empty design, so a case left alone can still be submitted.
      setAnswers(
        Object.fromEntries(
          next.objectives.flatMap((o) => {
            const text = initialDesignText(o);
            return text ? [[o.id, text] as const] : [];
          }),
        ),
      );
      setHints({});
      setCalls([]);
      setSelectedCall(null);
      setResult(null);
      setPhase("playing");
    } catch (e) {
      setError(messageOf(e, "Could not start a play. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  // The systems a mission can be built from, loaded once for backends that offer it.
  useEffect(() => {
    if (!apis.primary.listServers || servers !== null || serverError !== null) return;
    let cancelled = false;
    apis.primary.listServers().then(
      (list) => {
        if (!cancelled) setServers(list);
      },
      () => {
        if (!cancelled) setServerError("The list of systems is unavailable right now. The classic missions still work.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [apis.primary, servers, serverError]);

  /** Builds a mission from the chosen system, showing the cave while it works. */
  const build = async (name: string) => {
    if (!selectedServer || !api.buildGame) return;
    setNickname(name);
    setBuilt(null);
    setBuildError(null);
    setBuildStage("reading");
    setError(null);
    setPhase("building");
    try {
      const outcome = await api.buildGame(selectedServer, (stage) =>
        // Stages only move forward, even if a status poll arrives late.
        setBuildStage((prev) => (prev && STAGE_ORDER[prev] > STAGE_ORDER[stage] ? prev : stage)),
      );
      setBuilt(outcome);
      setBuildStage("done");
    } catch (e) {
      setBuildError(messageOf(e, "The game could not be built. Please try again."));
    }
  };

  const leaveCave = () => {
    setPhase("idle");
    setBuilt(null);
    setBuildError(null);
    setBuildStage(null);
  };

  const runTool = async (tool: string, args: Record<string, unknown>) => {
    if (!session || running) return;
    setRunning(true);
    setError(null);
    const began = performance.now();
    try {
      const outcome = await api.call(session, tool, args);
      const record: CallRecord = {
        n: calls.length + 1,
        tool,
        args,
        isError: outcome.isError,
        text: outcome.text,
        durationMs: Math.round(performance.now() - began),
        wire: outcome.wire,
      };
      setCalls((prev) => [...prev, record]);
      setSelectedCall(record.n);
    } catch (e) {
      setError(messageOf(e, "That call failed. Try again."));
    } finally {
      setRunning(false);
    }
  };

  const requestHint = async (objectiveId: string) => {
    if (!session) return;
    setHintBusyId(objectiveId);
    try {
      const text = await api.hint(session, objectiveId);
      setHints((prev) => ({ ...prev, [objectiveId]: text }));
    } catch (e) {
      setError(messageOf(e, "Hint unavailable."));
    } finally {
      setHintBusyId(null);
    }
  };

  const submit = useCallback(async () => {
    if (!session) return;
    setPhase("submitting");
    setError(null);
    try {
      const outcome = await api.submit(session, answers);
      setResult(outcome);
      setPhase("result");
      void loadBoard(session.modeSlug);
    } catch (e) {
      setError(messageOf(e, "Could not submit. Please try again."));
      setPhase("playing");
    }
  }, [api, answers, loadBoard, session]);

  // Time limit: submit whatever has been answered when the clock runs out.
  const expired = session !== null && phase === "playing" && elapsed >= session.maxSeconds;
  useEffect(() => {
    if (expired) void submit();
  }, [expired, submit]);

  const reset = () => {
    setPhase("idle");
    setApi(apis.primary);
    setFallbackNote(null);
    setSession(null);
    setResult(null);
    setError(null);
  };

  const answeredAll =
    session !== null && session.objectives.every((o) => (answers[o.id] ?? "").trim().length > 0);
  const timeLeft = session ? Math.max(0, session.maxSeconds - elapsed) : 0;
  const overPar = session !== null && elapsed > session.parSeconds;

  return (
    <div className="quest">
      <header className="topbar">
        <div>
          <h1>MCP Quest</h1>
          {session ? <p className="muted">{session.modeTitle}</p> : null}
        </div>
        {phase === "playing" || phase === "submitting" ? (
          <dl className="stats" aria-label="Run status">
            <div>
              <dt>Player</dt>
              <dd>{nickname}</dd>
            </div>
            <div className={overPar ? "stat-warn" : undefined}>
              <dt>Time</dt>
              <dd>{formatDuration(elapsed)}</dd>
            </div>
            <div>
              <dt>Left</dt>
              <dd>{formatDuration(timeLeft)}</dd>
            </div>
          </dl>
        ) : null}
      </header>

      <main>
        {api.kind !== "live" && phase !== "idle" ? (
          <p className="banner">
            {fallbackNote ??
              (api.kind === "mcp"
                ? "Test mode: tools are served by a live MCP server, but scoring runs in this browser and is not prize-eligible."
                : "Test mode: offline preview with simulated tools. Scores are not prize-eligible.")}
          </p>
        ) : null}

        {phase === "idle" ? (
          <StartScreen
            isPreview={api.kind !== "live"}
            busy={busy}
            error={error}
            leaderboard={board}
            leaderboardError={boardError}
            initialNickname={nickname}
            modeSlug={modeSlug}
            onModeChange={setModeSlug}
            onStart={(name) => (selectedServer ? void build(name) : void start(name))}
            servers={apis.primary.listServers ? servers : undefined}
            serverError={serverError}
            selectedServer={selectedServer}
            onSelectServer={apis.primary.listServers ? setSelectedServer : undefined}
          />
        ) : null}

        {phase === "building" ? (
          <BuildScreen
            serverName={servers?.find((s) => s.slug === selectedServer)?.name ?? selectedServer ?? "the system"}
            stage={buildStage}
            title={built?.title ?? null}
            error={buildError ?? (built ? error : null)}
            starting={busy}
            onBegin={() => built && void start(nickname, `spec:${built.specId}`)}
            onBack={leaveCave}
            onRetry={() => void build(nickname)}
          />
        ) : null}

        {(phase === "playing" || phase === "submitting") && session ? (
          <div className={session.objectives.some((o) => o.kind === "build") ? "play-grid is-build" : "play-grid"}>
            <McpStatus server={session.mcpServer} kind={api.kind} />
            {session.objectives.some((o) => o.kind === "build") ? (
              <CaseWorkspace
                session={session}
                api={api}
                designs={answers}
                hints={hints}
                hintBusyId={hintBusyId}
                disabled={phase === "submitting"}
                onDesignChange={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
                onHint={(id) => void requestHint(id)}
              />
            ) : (
              <ObjectivesPanel
                scenario={session.scenario}
                objectives={session.objectives}
                answers={answers}
                hints={hints}
                hintPenalty={session.hintPenalty}
                disabled={phase === "submitting"}
                hintBusyId={hintBusyId}
                onAnswer={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
                onHint={(id) => void requestHint(id)}
              />
            )}

            {/* Build missions are self-contained: the MCP server is reached through the
                designers and their test runs. Only the question mode needs the raw tools. */}
            {session.objectives.some((o) => o.kind === "build") ? null : (
              <div className="play-right">
                <ToolWorkbench
                  tools={session.tools}
                  disabled={phase === "submitting" || calls.length >= session.maxCalls}
                  running={running}
                  callsUsed={calls.length}
                  parCalls={session.parCalls}
                  maxCalls={session.maxCalls}
                  onRun={(tool, args) => void runTool(tool, args)}
                />
                <ResponseViewer calls={calls} selectedN={selectedCall} onSelect={setSelectedCall} />
              </div>
            )}

            <div className="submit-bar">
              {error ? (
                <p className="error" role="alert">
                  {error}
                </p>
              ) : (
                <p className="muted">
                  {answeredAll
                    ? "You get one submission. Check your answers first."
                    : "Answer every question, then submit. You only get one submission."}
                </p>
              )}
              <button
                type="button"
                className="primary"
                disabled={phase === "submitting" || !answeredAll}
                onClick={() => void submit()}
              >
                {phase === "submitting" ? "Scoring…" : "Submit answers"}
              </button>
            </div>
          </div>
        ) : null}

        {phase === "result" && session && result ? (
          <ResultScreen
            session={session}
            nickname={nickname}
            result={result}
            isPreview={api.kind !== "live"}
            leaderboard={board}
            leaderboardError={boardError}
            onPlayAgain={reset}
          />
        ) : null}
      </main>

      <footer className="footer muted">Station: {station}</footer>
    </div>
  );
}
