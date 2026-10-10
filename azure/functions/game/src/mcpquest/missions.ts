/**
 * What the player sees when choosing a mission. Kept separate from `api/modes.ts` (which
 * holds the case builders and answer logic) so the live Code Site build can show the
 * mission list without bundling any of the judge.
 */

export interface Mission {
  slug: string;
  title: string;
  tagline: string;
}

export const MISSIONS: Mission[] = [
  {
    slug: "fixit",
    title: "Fix it with Power Platform",
    tagline: "Pick the right Power Platform tool for three business problems, then build and test the fix.",
  },
  {
    slug: "incident-queue",
    title: "Investigate the queue",
    tagline: "Quick fact-finding: three questions answered by querying the system.",
  },
];

export const DEFAULT_MISSION = MISSIONS[0].slug;

export function findMission(slug: string): Mission {
  return MISSIONS.find((m) => m.slug === slug) ?? MISSIONS[0];
}

export function mission(slug: string): Mission {
  const found = MISSIONS.find((m) => m.slug === slug);
  if (!found) throw new Error(`Unknown mission: ${slug}`);
  return found;
}
