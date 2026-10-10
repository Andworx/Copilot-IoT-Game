import { createSourcedPrizeClaim, dataverseFetch, dataverseFetchRaw, getActiveContestCampaignId, escapeODataString } from "./dataverse";
import { ConflictError, type ClaimIssuer, type NewPlay, type CompletedPlay, type PlayRow, type PlayState, type PlayStore } from "../mcpquest/store";
import type { LeaderboardEntry } from "../mcpquest/types";

/**
 * Dataverse implementation of the MCP Quest play store, and the claim issuer that connects
 * a passing play to the shared prize engine.
 *
 * Table: `andy_mcpquestplay` in the MCPQuest solution (export: solutions/MCPQuest, notes:
 * tables/andy_mcpquestplay). One row per play. It is the session store (state JSON + seed),
 * the leaderboard source and the audit record, and links to the shared Prize Claim for
 * passing plays.
 *
 * Every name below was taken from the exported solution, not assumed. A contract test
 * (test/mcpquest.test.ts) reads the exported Entity.xml and fails if any of these drift from
 * it, so rename a column in Dataverse, re-export, and change it here in one place.
 */

/** Logical names of the play table's columns, as exported. */
export const PLAY_COLUMNS = {
  id: "andy_mcpquestplayid",
  name: "andy_playname",
  station: "andy_station",
  mission: "andy_mission",
  nickname: "andy_nickname",
  seed: "andy_seed",
  // Spelled as deployed ("snaphot"). Recreate the column and change this line to fix the typo.
  snapshotVersion: "andy_snaphotversion",
  startedTime: "andy_startedtime",
  submittedTime: "andy_submittedtime",
  isSubmitted: "andy_issubmitted",
  isPassed: "andy_ispassed",
  isClaimIssued: "andy_isclaimissued",
  claimToken: "andy_claimtoken",
  score: "andy_score",
  entriesAwarded: "andy_entriesawarded",
  durationSeconds: "andy_durationseconds",
  toolCalls: "andy_toolcalls",
  hintsUsed: "andy_hintsused",
  testRuns: "andy_testruns",
  stateJson: "andy_statejson",
  resultJson: "andy_resultjson",
  campaign: "andy_campaign",
  prizeClaim: "andy_prizeclaim",
} as const;

/** Entity set name as exported. Dataverse pluralised "play" to "plaies". */
export const PLAYS_SET_DEFAULT = "andy_mcpquestplaies";
/** Single-valued navigation properties are the lookup attributes' schema names (case matters). */
export const PRIZE_CLAIM_NAV_DEFAULT = "andy_PrizeClaim";
export const CAMPAIGN_NAV_DEFAULT = "andy_Campaign";

const PLAYS_SET = process.env.MCPQUEST_PLAYS_SET ?? PLAYS_SET_DEFAULT;
const PRIZE_CLAIM_NAV = process.env.MCPQUEST_PRIZE_CLAIM_NAV ?? PRIZE_CLAIM_NAV_DEFAULT;
const CAMPAIGN_NAV = process.env.MCPQUEST_CAMPAIGN_NAV ?? CAMPAIGN_NAV_DEFAULT;
const PRIZE_CLAIMS_SET = "andy_prizeclaims";
const CONTEST_CAMPAIGNS_SET = "andy_contestcampaigns";

export const MCPQUEST_SOURCE_KEY = "mcpquest";

const C = PLAY_COLUMNS;

const SELECT = [
  C.id, C.station, C.mission, C.nickname, C.seed, C.snapshotVersion, C.startedTime,
  C.stateJson, C.isSubmitted, C.isPassed, C.claimToken, C.isClaimIssued, C.resultJson,
].join(",");

type Row = { "@odata.etag"?: string } & Record<string, unknown>;

const WITH_ETAG = { Prefer: "return=representation" };

function text(row: Row, column: string): string | null {
  const value = row[column];
  return typeof value === "string" ? value : null;
}

function parseState(value: string | null): PlayState {
  try {
    const parsed = JSON.parse(value ?? "") as PlayState;
    if (parsed && parsed.v === 1 && typeof parsed.cases === "object") return parsed;
  } catch {
    // fall through
  }
  return { v: 1, cases: {}, hints: [], calls: 0 };
}

export function parsePlayRow(row: Row): PlayRow {
  const started = text(row, C.startedTime);
  return {
    id: String(row[C.id]),
    etag: row["@odata.etag"] ?? "",
    station: text(row, C.station) ?? "default",
    modeSlug: text(row, C.mission) ?? "",
    nickname: text(row, C.nickname) ?? "",
    seed: text(row, C.seed) ?? "",
    snapshot: text(row, C.snapshotVersion) ?? "",
    startedAt: started ? Date.parse(started) : 0,
    state: parseState(text(row, C.stateJson)),
    submitted: row[C.isSubmitted] === true,
    passed: row[C.isPassed] === true,
    claimToken: text(row, C.claimToken),
    claimIssued: row[C.isClaimIssued] === true,
    resultJson: text(row, C.resultJson),
  };
}

/** "<station> · <mission> · <nickname> · <time>", kept well inside the primary column. */
function playName(station: string, modeSlug: string, nickname: string, at: number): string {
  return `${station} · ${modeSlug} · ${nickname} · ${new Date(at).toISOString().slice(0, 19)}Z`.slice(0, 200);
}

export function buildCreatePayload(play: NewPlay): Record<string, unknown> {
  return {
    [C.name]: playName(play.station, play.modeSlug, play.nickname, play.startedAt),
    [C.station]: play.station,
    [C.mission]: play.modeSlug,
    [C.nickname]: play.nickname,
    [C.seed]: play.seed,
    [C.snapshotVersion]: play.snapshot,
    [C.startedTime]: new Date(play.startedAt).toISOString(),
    [C.stateJson]: JSON.stringify(play.state),
    [C.isSubmitted]: false,
    [C.isPassed]: false,
    [C.isClaimIssued]: false,
    ...(play.campaignId ? { [`${CAMPAIGN_NAV}@odata.bind`]: `/${CONTEST_CAMPAIGNS_SET}(${play.campaignId})` } : {}),
  };
}

export function buildCompletePayload(play: CompletedPlay): Record<string, unknown> {
  return {
    [C.isSubmitted]: true,
    [C.isPassed]: play.passed,
    [C.score]: play.score,
    [C.entriesAwarded]: play.entriesAwarded,
    [C.durationSeconds]: play.durationSeconds,
    [C.toolCalls]: play.callCount,
    [C.hintsUsed]: play.hintsUsed,
    [C.testRuns]: play.testCount,
    [C.claimToken]: play.claimToken,
    [C.resultJson]: play.resultJson,
    [C.submittedTime]: new Date(play.submittedAt).toISOString(),
    [C.stateJson]: JSON.stringify(play.state),
  };
}

export function dataversePlayStore(): PlayStore {
  return {
    async create(play) {
      const response = await dataverseFetch(`${PLAYS_SET}?$select=${C.id}`, {
        method: "POST",
        headers: WITH_ETAG,
        body: JSON.stringify(buildCreatePayload(play)),
      });
      const body = (await response.json()) as Row;
      return { id: String(body[C.id]), etag: body["@odata.etag"] ?? "" };
    },

    async load(id) {
      const response = await dataverseFetchRaw(`${PLAYS_SET}(${id})?$select=${SELECT}`);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Dataverse GET ${PLAYS_SET} failed: ${response.status}`);
      return parsePlayRow((await response.json()) as Row);
    },

    async saveState(id, state, etag) {
      const response = await dataverseFetchRaw(`${PLAYS_SET}(${id})?$select=${C.id}`, {
        method: "PATCH",
        headers: { ...WITH_ETAG, ...(etag ? { "If-Match": etag } : {}) },
        body: JSON.stringify({ [C.stateJson]: JSON.stringify(state) }),
      });
      if (response.status === 412) throw new ConflictError();
      if (!response.ok) throw new Error(`Dataverse PATCH ${PLAYS_SET} failed: ${response.status} ${await response.text()}`);
      return ((await response.json()) as Row)["@odata.etag"] ?? "";
    },

    async complete(id, etag, play) {
      const response = await dataverseFetchRaw(`${PLAYS_SET}(${id})`, {
        method: "PATCH",
        headers: etag ? { "If-Match": etag } : {},
        body: JSON.stringify(buildCompletePayload(play)),
      });
      if (response.status === 412) throw new ConflictError();
      if (!response.ok) throw new Error(`Dataverse PATCH ${PLAYS_SET} failed: ${response.status} ${await response.text()}`);
    },

    async markClaimIssued(id, prizeClaimId) {
      await dataverseFetch(`${PLAYS_SET}(${id})`, {
        method: "PATCH",
        body: JSON.stringify({
          [C.isClaimIssued]: true,
          [`${PRIZE_CLAIM_NAV}@odata.bind`]: `/${PRIZE_CLAIMS_SET}(${prizeClaimId})`,
        }),
      });
    },

    async leaderboard(modeSlug, limit) {
      const campaignId = await getActiveContestCampaignId();
      const filter =
        `${C.isSubmitted} eq true and ${C.mission} eq '${escapeODataString(modeSlug)}'` +
        (campaignId ? ` and _${C.campaign}_value eq ${campaignId}` : "");
      const response = await dataverseFetch(
        `${PLAYS_SET}?$select=${C.nickname},${C.score},${C.durationSeconds}&$filter=${filter}` +
          `&$orderby=${C.score} desc,${C.durationSeconds} asc&$top=${limit}`,
      );
      const body = (await response.json()) as { value: Row[] };
      return body.value.map(
        (r, index): LeaderboardEntry => ({
          rank: index + 1,
          nickname: text(r, C.nickname) ?? "PLAYER",
          score: typeof r[C.score] === "number" ? (r[C.score] as number) : 0,
          durationSeconds: typeof r[C.durationSeconds] === "number" ? (r[C.durationSeconds] as number) : 0,
        }),
      );
    },

    async rankOf(modeSlug, score, durationSeconds) {
      const campaignId = await getActiveContestCampaignId();
      const s = Math.trunc(score);
      const d = Math.trunc(durationSeconds);
      const filter =
        `${C.isSubmitted} eq true and ${C.mission} eq '${escapeODataString(modeSlug)}'` +
        (campaignId ? ` and _${C.campaign}_value eq ${campaignId}` : "") +
        ` and (${C.score} gt ${s} or (${C.score} eq ${s} and ${C.durationSeconds} lt ${d}))`;
      const response = await dataverseFetch(`${PLAYS_SET}?$select=${C.id}&$filter=${filter}&$count=true&$top=1`);
      const body = (await response.json()) as { "@odata.count"?: number };
      return (body["@odata.count"] ?? 0) + 1;
    },
  };
}

/** Connects a passing play to the shared engine by minting a Prize Claim for source `mcpquest`. */
export function dataverseClaimIssuer(): ClaimIssuer {
  return {
    async issue(input) {
      const { prizeClaimId } = await createSourcedPrizeClaim({
        claimToken: input.claimToken,
        contestSourceKey: MCPQUEST_SOURCE_KEY,
        name: `MCP Quest ${input.station} ${input.modeSlug} ${input.nickname}`.slice(0, 200),
      });
      return { prizeClaimId };
    },
  };
}
