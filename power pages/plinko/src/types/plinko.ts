/**
 * SignalR `plinkoResult` payload broadcast on the `gamebox` hub after the backend
 * accepts a Plinko landing (issue #128). See power pages/docs/PLINKO_GAME_PLAN.md §4.
 */
export interface PlinkoResult {
  stationSlug: string;
  /** Pi-generated id for the physical landing; the idempotency key. */
  eventId: string;
  /** 1-based bucket the puck landed in. */
  bucket: number;
  /** 1-based bucket the Pi's chase lights had lit at the moment of landing. */
  litBucket: number;
  bucketCount: number;
  /** Grand-prize entries this play is worth once the player shares contact info. */
  entriesAwarded: number;
  /** Prize Claim bearer token encoded into the QR. */
  claimToken: string;
  /**
   * False when staff turned Game Mode off: just show the bucket (no QR, no entries). Absent means on.
   */
  gameModeActive?: boolean;
}
