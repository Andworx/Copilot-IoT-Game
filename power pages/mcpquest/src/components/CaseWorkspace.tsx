import { useState } from "react";
import {
  defaultDesign,
  parseAnyDesign,
  type AgentDesign,
  type AppDesign,
  type FlowDesign,
  type ReportDesign,
  type SecurityDesign,
  type SiteDesign,
  type TableDesign,
} from "@mcpquest/designs";
import { findProduct } from "@mcpquest/platform";
import {
  PRODUCT_FOR_DESIGNER,
  emptyActionDesign,
  parseActionDesign,
  scenarioKeys,
  scenarioTriggers,
} from "@mcpquest/specDesigns";
import type { DesignerKind, GameApi, Objective, SessionInfo, TestReport } from "@mcpquest/types";
import { ActionSequenceDesigner } from "./ActionSequenceDesigner";
import { SamplesPanel } from "./SamplesPanel";
import { SettingsDesigner } from "./SettingsDesigner";
import { AgentDesigner } from "./AgentDesigner";
import { AppDesigner } from "./AppDesigner";
import { FlowDesigner } from "./FlowDesigner";
import { ReportDesigner } from "./ReportDesigner";
import { RunHistory } from "./RunHistory";
import { SecurityDesigner } from "./SecurityDesigner";
import { SiteDesigner } from "./SiteDesigner";
import { TableDesigner } from "./TableDesigner";
import { ToolChooser } from "./ToolChooser";

interface Props {
  session: SessionInfo;
  api: GameApi;
  /** Design JSON per objective id, owned by the parent so it is submitted with the play. */
  designs: Record<string, string>;
  hints: Record<string, string>;
  hintBusyId: string | null;
  disabled: boolean;
  onDesignChange: (objectiveId: string, design: string) => void;
  onHint: (objectiveId: string) => void;
}

interface CaseUi {
  chosen: string | null;
  message: string | null;
  busy: "choose" | "test" | null;
  error: string | null;
  report: TestReport | null;
  testedDesign: string | null;
}

const BLANK: CaseUi = { chosen: null, message: null, busy: null, error: null, report: null, testedDesign: null };

function caseComplete(state: CaseUi, design: string | undefined): boolean {
  return state.testedDesign === design && (state.report?.criteria.length ?? 0) > 0 &&
    (state.report?.criteria.every((criterion) => criterion.ok) ?? false);
}

const ROOM_SPOTS = [
  { x: 24, y: 30 },
  { x: 52, y: 24 },
  { x: 78, y: 34 },
  { x: 36, y: 58 },
  { x: 66, y: 64 },
  { x: 86, y: 72 },
] as const;

const TEST_LABEL: Record<DesignerKind, string> = {
  flow: "Test the flow",
  report: "Check the report",
  app: "Run the app",
  site: "Preview the site",
  table: "Check the table",
  security: "Check the roles",
  agent: "Test the agent",
};

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function CaseWorkspace({ session, api, designs, hints, hintBusyId, disabled, onDesignChange, onHint }: Props) {
  const cases = session.objectives.filter((o) => o.kind === "build");
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState<Record<string, boolean>>({});
  const [ui, setUi] = useState<Record<string, CaseUi>>({});

  const patch = (id: string, update: Partial<CaseUi>) =>
    setUi((prev) => ({ ...prev, [id]: { ...(prev[id] ?? BLANK), ...update } }));

  const current: Objective | undefined = cases[active];
  if (!current) return null;
  const activeSpot = ROOM_SPOTS[active % ROOM_SPOTS.length] ?? ROOM_SPOTS[0];
  const currentStarted = Boolean(started[current.id]);
  const designer: DesignerKind = current.designer ?? "flow";
  const state = ui[current.id] ?? BLANK;
  const designText = designs[current.id];
  const hint = hints[current.id];

  const choose = async (productId: string) => {
    patch(current.id, { busy: "choose", error: null });
    try {
      const result = await api.choose(session, current.id, productId);
      if (result.correct) {
        patch(current.id, { chosen: productId, message: result.message, busy: null });
        if (!designs[current.id]) onDesignChange(current.id, JSON.stringify(defaultDesign(designer)));
      } else {
        patch(current.id, { message: result.message, busy: null });
      }
    } catch (e) {
      patch(current.id, { busy: null, error: messageOf(e, "Could not check that choice.") });
    }
  };

  const runTest = async () => {
    if (!designText) return;
    patch(current.id, { busy: "test", error: null });
    try {
      const report = await api.test(session, current.id, designText);
      patch(current.id, { busy: null, report, testedDesign: designText });
    } catch (e) {
      patch(current.id, { busy: null, error: messageOf(e, "The test could not run.") });
    }
  };

  // A generated game's cases say how they are judged. They use the two generic designers and
  // the product is given, so there is no product to choose first.
  const generated = current.judging !== undefined;
  const design = generated
    ? null
    : (designText ? parseAnyDesign(designer, designText) : null) ?? defaultDesign(designer);
  const update = (next: unknown) => onDesignChange(current.id, JSON.stringify(next));
  const generatedProduct = PRODUCT_FOR_DESIGNER[designer];
  const actionDesign = generated
    ? (designText ? parseActionDesign(designText) : null) ?? emptyActionDesign(scenarioTriggers(current.scenarios))
    : null;
  const settingsDesign: unknown = (() => {
    if (!generated || !designText) return {};
    try {
      return JSON.parse(designText) as unknown;
    } catch {
      return {};
    }
  })();

  const stale = state.report !== null && state.testedDesign !== designText;
  const testsLeft = state.report ? state.report.testsLeft : session.maxTests;
  const product = state.chosen ? findProduct(state.chosen) : undefined;
  const criteria = state.report?.criteria;

  return (
    <section className={currentStarted ? "card cases is-working" : "card cases"} aria-labelledby="cases-title">
      <h2 id="cases-title">Mission</h2>
      <p className="scenario">{session.scenario}</p>

      <div className="mission-room">
        <div
          className="mission-room-map"
          style={{ ["--room-avatar-x" as string]: `${activeSpot.x}%`, ["--room-avatar-y" as string]: `${activeSpot.y}%` }}
        >
          <div className="mission-room-exit" aria-hidden="true" />
          <div className="mission-room-avatar" aria-hidden="true">
            <span />
          </div>
          {cases.map((c, index) => {
            const s = ui[c.id] ?? BLANK;
            const done = caseComplete(s, designs[c.id]);
            const spot = ROOM_SPOTS[index % ROOM_SPOTS.length] ?? ROOM_SPOTS[0];
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={index === active}
                className={index === active ? "mission-room-item is-active" : done ? "mission-room-item is-done" : "mission-room-item"}
                style={{ ["--room-item-x" as string]: `${spot.x}%`, ["--room-item-y" as string]: `${spot.y}%` }}
                onClick={() => setActive(index)}
              >
                <span>{done ? "OK" : index + 1}</span>
                <strong>{c.label ?? c.caseTitle ?? c.id}</strong>
              </button>
            );
          })}
        </div>

        <div className="mission-room-index" aria-label="Work items">
          {cases.map((c, index) => {
            const done = caseComplete(ui[c.id] ?? BLANK, designs[c.id]);
            return (
              <button key={c.id} type="button" aria-pressed={index === active} onClick={() => setActive(index)}>
                <span aria-hidden="true">{index + 1}</span>
                {c.label ?? c.caseTitle ?? c.id}
                {done ? <span className="work-complete">Complete</span> : null}
              </button>
            );
          })}
        </div>

        <aside className="mission-room-panel" aria-live="polite">
          <span>Work item</span>
          <strong>{current.label ?? current.caseTitle ?? current.id}</strong>
          <p>{current.prompt}</p>
          <button
            type="button"
            className="primary"
            disabled={disabled}
            onClick={() => setStarted((prev) => ({ ...prev, [current.id]: true }))}
          >
            {currentStarted ? "Work open" : "Begin work"}
          </button>
        </aside>
      </div>

      <div className="case-tabs" role="tablist" aria-label="Cases">
        {cases.map((c, index) => {
          const s = ui[c.id] ?? BLANK;
          const done = caseComplete(s, designs[c.id]);
          return (
            <button
              key={c.id}
              role="tab"
              type="button"
              aria-selected={index === active}
              className={index === active ? "tab active" : "tab"}
              onClick={() => setActive(index)}
            >
              {c.label ?? c.id}
              {done ? " ✓" : s.chosen ? " ●" : ""}
            </button>
          );
        })}
      </div>

      {currentStarted ? (
        <div className="case-body">
        <h3 className="case-title">{current.caseTitle}</h3>
        <p className="case-brief">{current.prompt}</p>

        {current.requirements ? (
          <div className="requirements">
            <p className="flow-kicker">What a good solution does</p>
            <ul>
              {current.requirements.map((text, i) => {
                const result = criteria?.[i];
                const mark = result ? (stale ? "·" : result.ok ? "✓" : "✗") : "○";
                const cls = result && !stale ? (result.ok ? "req ok" : "req bad") : "req";
                return (
                  <li key={text} className={cls}>
                    <span aria-hidden="true">{mark}</span>
                    {text}
                    {result && !stale ? <span className="visually-hidden">{result.ok ? " (met)" : " (not met)"}</span> : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {!generated && !state.chosen ? (
          <ToolChooser
            disabled={disabled}
            busy={state.busy === "choose"}
            message={state.message}
            onChoose={(id) => void choose(id)}
          />
        ) : (
          <>
            {generated ? (
              <p className="chosen" role="status">
                <strong>{generatedProduct.name}</strong> · build the {generatedProduct.noun}
              </p>
            ) : (
              <p className="chosen" role="status">
                <strong>{product?.name}</strong> · {state.message}
              </p>
            )}

            {generated && actionDesign && current.judging === "run" ? (
              <ActionSequenceDesigner
                designer={designer}
                design={actionDesign}
                tools={session.tools}
                triggers={scenarioTriggers(current.scenarios)}
                scenarioKeys={scenarioKeys(current.scenarios)}
                disabled={disabled}
                onChange={update}
              />
            ) : null}
            {generated && current.judging === "design" ? (
              <SettingsDesigner
                designer={designer}
                fields={current.designFields ?? []}
                design={settingsDesign}
                disabled={disabled}
                onChange={update}
              />
            ) : null}

            {!generated && designer === "flow" ? (
              <FlowDesigner design={design as FlowDesign} catalog={session.catalog} disabled={disabled} onChange={update} />
            ) : null}
            {!generated && designer === "report" ? (
              <ReportDesigner design={design as ReportDesign} catalog={session.catalog} disabled={disabled} onChange={update} />
            ) : null}
            {!generated && designer === "app" ? (
              <AppDesigner design={design as AppDesign} catalog={session.catalog} disabled={disabled} onChange={update} />
            ) : null}
            {!generated && designer === "site" ? (
              <SiteDesigner design={design as SiteDesign} disabled={disabled} onChange={update} />
            ) : null}
            {!generated && designer === "table" ? (
              <TableDesigner design={design as TableDesign} catalog={session.catalog} disabled={disabled} onChange={update} />
            ) : null}
            {!generated && designer === "security" ? (
              <SecurityDesigner design={design as SecurityDesign} disabled={disabled} onChange={update} />
            ) : null}
            {!generated && designer === "agent" ? (
              <AgentDesigner design={design as AgentDesign} disabled={disabled} onChange={update} />
            ) : null}

            <div className="test-bar">
              <button
                type="button"
                className="primary"
                disabled={disabled || state.busy === "test" || testsLeft <= 0}
                onClick={() => void runTest()}
              >
                {state.busy === "test" ? "Running…" : TEST_LABEL[designer]}
              </button>
              <span className="muted">
                {testsLeft} test run{testsLeft === 1 ? "" : "s"} left for this case
                {stale ? " · changed since the last test" : ""}
              </span>
            </div>

            {state.report?.runs ? <RunHistory runs={state.report.runs} /> : null}
          </>
        )}

        {session.samples && session.samples.length > 0 ? <SamplesPanel samples={session.samples} /> : null}

        {state.error ? (
          <p className="error" role="alert">
            {state.error}
          </p>
        ) : null}

        {hint ? (
          <p className="hint" role="note">
            <strong>Hint:</strong> {hint}
          </p>
        ) : (
          <button
            type="button"
            className="link"
            disabled={disabled || hintBusyId === current.id}
            onClick={() => onHint(current.id)}
          >
            Need a hint? (−{session.hintPenalty} points)
          </button>
        )}
        </div>
      ) : (
        <div className="mission-room-locked" role="status">
          <strong>Move to a work item.</strong>
          <span>Select a marker in the room, then press Begin work to open its tools.</span>
        </div>
      )}
    </section>
  );
}
