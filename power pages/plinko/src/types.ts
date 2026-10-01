export interface PlinkoResult {
  station?: string;
  stationSlug?: string;
  bucket: number;
  litBucket: number;
  isLitBucket: boolean;
  entriesAwarded: number;
  claimToken?: string;
  hardwareEventId?: string;
}