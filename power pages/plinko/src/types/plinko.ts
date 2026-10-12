import aiBuilderLogo from "../assets/logos/AIBuilder_scalable.svg";
import dataverseLogo from "../assets/logos/Dataverse_scalable.svg";
import powerAppsLogo from "../assets/logos/PowerApps_scalable.svg";
import powerAutomateLogo from "../assets/logos/PowerAutomate_scalable.svg";
import powerPagesLogo from "../assets/logos/PowerPages_scalable.svg";
import powerPlatformLogo from "../assets/logos/PowerPlatform_scalable.svg";

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
  /** Ordered icon ids, one per bucket. */
  bucketIcons?: string[];
  /**
   * False when staff turned Game Mode off: just show the bucket (no QR, no entries). Absent means on.
   */
  gameModeActive?: boolean;
}

export const BUCKET_ICONS = {
  powerapps: { label: "Power Apps", src: powerAppsLogo },
  dataverse: { label: "Dataverse", src: dataverseLogo },
  powerautomate: { label: "Power Automate", src: powerAutomateLogo },
  powerpages: { label: "Power Pages", src: powerPagesLogo },
  aibuilder: { label: "AI Builder", src: aiBuilderLogo },
  powerplatform: { label: "Power Platform", src: powerPlatformLogo },
} as const;

export type BucketIconId = keyof typeof BUCKET_ICONS;

export const BUCKET_ICON_LOGOS = Object.values(BUCKET_ICONS).map((icon) => icon.src);

export const DEFAULT_BUCKET_ICON_IDS: BucketIconId[] = [
  "powerapps",
  "dataverse",
  "powerautomate",
  "powerpages",
  "aibuilder",
  "powerplatform",
];

export function iconForBucket(bucketNumber: number, bucketIcons?: string[]): { label: string; src: string } {
  const id = bucketIcons?.[bucketNumber - 1] ?? DEFAULT_BUCKET_ICON_IDS[(bucketNumber - 1) % DEFAULT_BUCKET_ICON_IDS.length];
  return BUCKET_ICONS[id as BucketIconId] ?? BUCKET_ICONS[DEFAULT_BUCKET_ICON_IDS[(bucketNumber - 1) % DEFAULT_BUCKET_ICON_IDS.length]];
}
