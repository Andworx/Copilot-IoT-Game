import type { LeaderboardEntry } from "./types";
import type { CaseState } from "./judge";

/** Everything that has to survive between requests of one play. */
export interface PlayState {
  v: 1;
  cases: Record<string, CaseState>;
  hints: string[];
  calls: number;
}

export interface PlayRow {
  id: string;
  /** Concurrency token; changes on every write. */
  etag: string;
  station: string;
  modeSlug: string;
  nickname: string;
  seed: string;
  snapshot: string;
  /** Epoch milliseconds, server clock. */
  startedAt: number;
  state: PlayState;
  submitted: boolean;
  passed: boolean;
  claimToken: string | null;
  claimIssued: boolean;
  resultJson: string | null;
}

export interface NewPlay {
  station: string;
  modeSlug: string;
  nickname: string;
  seed: string;
  snapshot: string;
  startedAt: number;
  state: PlayState;
  campaignId: string | null;
}

export interface CompletedPlay {
  passed: boolean;
  score: number;
  /** Grand-prize entries earned, from the 0-100 score and the campaign cap. */
  entriesAwarded: number;
  durationSeconds: number;
  callCount: number;
  hintsUsed: number;
  testCount: number;
  claimToken: string | null;
  resultJson: string;
  submittedAt: number;
  state: PlayState;
}

/** Another request changed the play first. The caller should reload and retry. */
export class ConflictError extends Error {
  constructor() {
    super("The play was changed by another request");
    this.name = "ConflictError";
  }
}

/** Where plays live. Dataverse in production, in memory in tests. */
export interface PlayStore {
  create(play: NewPlay): Promise<{ id: string; etag: string }>;
  load(id: string): Promise<PlayRow | null>;
  /** Throws ConflictError when `etag` is stale. Returns the new etag. */
  saveState(id: string, state: PlayState, etag: string): Promise<string>;
  /** Atomically marks the play submitted. Throws ConflictError when `etag` is stale. */
  complete(id: string, etag: string, play: CompletedPlay): Promise<void>;
  markClaimIssued(id: string, prizeClaimId: string): Promise<void>;
  leaderboard(modeSlug: string, limit: number): Promise<LeaderboardEntry[]>;
  /** 1-based rank of a score among submitted plays of a mode (ties broken by time). */
  rankOf(modeSlug: string, score: number, durationSeconds: number): Promise<number>;
}

/** Issues the shared engine's Prize Claim for a submitted play. Idempotent per token. */
export interface ClaimIssuer {
  issue(input: { claimToken: string; station: string; modeSlug: string; nickname: string }): Promise<{ prizeClaimId: string }>;
}
