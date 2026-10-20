import { CONTEST_CAMPAIGNS_SET, dataverseFetch, isGuidLike } from "./dataverse";

// Same entity sets / navigation properties the claim path uses (see dataverse.ts), confirmed against
// solutions/PrizeEngine/Other/Relationships. A Source Cap row is the Campaign -> Source connection
// the Prize Engine model-driven app shows as "Campaign to Source".
const CONTEST_SOURCES_SET = "andy_contestsources";
const CONTEST_SOURCE_CAPS_SET = "andy_contestsourcecaps";
const SOURCE_CAP_CAMPAIGN_NAV = "andy_CampaignName"; // on andy_contestsourcecap, -> andy_contestcampaign
const SOURCE_CAP_SOURCE_NAV = "andy_Source"; // on andy_contestsourcecap, -> andy_contestsource

export interface CampaignSource {
  id: string;
  key: string;
  name: string;
}

export interface CampaignSummary {
  id: string;
  name: string;
  maxEntries: number | null;
  /** Ids of the Contest Sources with an active Source Cap on this campaign. */
  sourceIds: string[];
}

export interface CampaignOverview {
  campaigns: CampaignSummary[];
  sources: CampaignSource[];
}

interface CampaignRow {
  andy_contestcampaignid: string;
  andy_eventname?: string | null;
  andy_maxentriespercontact?: number | null;
}

interface SourceRow {
  andy_contestsourceid: string;
  andy_sourcekey?: string | null;
  andy_sourcename?: string | null;
}

interface CapRow {
  andy_contestsourcecapid: string;
  statecode?: number | null;
  _andy_campaignname_value?: string | null;
  _andy_source_value?: string | null;
}

const CAMPAIGN_SELECT = "andy_contestcampaignid,andy_eventname,andy_maxentriespercontact";

function toSource(row: SourceRow): CampaignSource {
  const key = row.andy_sourcekey?.trim() ?? "";
  return { id: row.andy_contestsourceid, key, name: row.andy_sourcename?.trim() || key };
}

function toCampaign(row: CampaignRow, sourceIds: string[]): CampaignSummary {
  return {
    id: row.andy_contestcampaignid,
    name: row.andy_eventname?.trim() || "Untitled campaign",
    maxEntries: typeof row.andy_maxentriespercontact === "number" ? row.andy_maxentriespercontact : null,
    sourceIds,
  };
}

async function listActiveCaps(): Promise<CapRow[]> {
  const response = await dataverseFetch(
    `${CONTEST_SOURCE_CAPS_SET}?$select=andy_contestsourcecapid,_andy_campaignname_value,_andy_source_value&$filter=statecode eq 0`
  );
  return ((await response.json()) as { value: CapRow[] }).value;
}

function sourceIdsFor(caps: CapRow[], campaignId: string): string[] {
  return caps
    .filter((cap) => cap._andy_campaignname_value?.toLowerCase() === campaignId.toLowerCase() && cap._andy_source_value)
    .map((cap) => cap._andy_source_value as string);
}

/** Active campaigns (newest first, so index 0 is the one the games use) with their connected sources, plus every active source. */
export async function listCampaignOverview(): Promise<CampaignOverview> {
  const [campaignsRes, sourcesRes, caps] = await Promise.all([
    dataverseFetch(`${CONTEST_CAMPAIGNS_SET}?$select=${CAMPAIGN_SELECT}&$filter=statecode eq 0&$orderby=createdon desc`),
    dataverseFetch(`${CONTEST_SOURCES_SET}?$select=andy_contestsourceid,andy_sourcekey,andy_sourcename&$filter=statecode eq 0&$orderby=andy_sourcename asc`),
    listActiveCaps(),
  ]);
  const campaigns = ((await campaignsRes.json()) as { value: CampaignRow[] }).value;
  const sources = ((await sourcesRes.json()) as { value: SourceRow[] }).value;
  return {
    campaigns: campaigns.map((row) => toCampaign(row, sourceIdsFor(caps, row.andy_contestcampaignid))),
    sources: sources.map(toSource),
  };
}

async function fetchCampaign(campaignId: string): Promise<CampaignRow | null> {
  const response = await dataverseFetch(
    `${CONTEST_CAMPAIGNS_SET}?$select=${CAMPAIGN_SELECT}&$filter=statecode eq 0 and andy_contestcampaignid eq ${campaignId}&$top=1`
  );
  return ((await response.json()) as { value: CampaignRow[] }).value[0] ?? null;
}

async function fetchSource(sourceId: string): Promise<SourceRow | null> {
  const response = await dataverseFetch(
    `${CONTEST_SOURCES_SET}?$select=andy_contestsourceid,andy_sourcekey,andy_sourcename&$filter=statecode eq 0 and andy_contestsourceid eq ${sourceId}&$top=1`
  );
  return ((await response.json()) as { value: SourceRow[] }).value[0] ?? null;
}

/** Every Source Cap for the pair, active or not: the MDA keeps one row per campaign/source, so a re-link reactivates it. */
async function fetchCapsForPair(campaignId: string, sourceId: string): Promise<CapRow[]> {
  const response = await dataverseFetch(
    `${CONTEST_SOURCE_CAPS_SET}?$select=andy_contestsourcecapid,statecode` +
      `&$filter=_andy_campaignname_value eq ${campaignId} and _andy_source_value eq ${sourceId}`
  );
  return ((await response.json()) as { value: CapRow[] }).value;
}

export class CampaignNotFoundError extends Error {}

/** Staff edit of a campaign's per-contact entry cap. */
export async function setCampaignMaxEntries(campaignId: string, maxEntries: number): Promise<CampaignSummary> {
  assertGuid(campaignId, "campaignId");
  if (!(await fetchCampaign(campaignId))) throw new CampaignNotFoundError("Unknown campaign");
  await dataverseFetch(`${CONTEST_CAMPAIGNS_SET}(${campaignId})`, {
    method: "PATCH",
    body: JSON.stringify({ andy_maxentriespercontact: maxEntries }),
  });
  return summarize(campaignId);
}

/**
 * Connects or disconnects a Contest Source on a campaign. Disconnecting deactivates the Source Cap
 * rather than deleting it: Grand Prize Entries keep a restricted reference to the rule they used.
 */
export async function setCampaignSourceLinked(campaignId: string, sourceId: string, linked: boolean): Promise<CampaignSummary> {
  assertGuid(campaignId, "campaignId");
  assertGuid(sourceId, "sourceId");
  const [campaign, source] = await Promise.all([fetchCampaign(campaignId), fetchSource(sourceId)]);
  if (!campaign) throw new CampaignNotFoundError("Unknown campaign");
  if (!source) throw new CampaignNotFoundError("Unknown source");

  const existing = await fetchCapsForPair(campaignId, sourceId);
  if (linked) {
    if (!existing.some((cap) => cap.statecode === 0)) {
      const inactive = existing[0];
      if (inactive) {
        await dataverseFetch(`${CONTEST_SOURCE_CAPS_SET}(${inactive.andy_contestsourcecapid})`, {
          method: "PATCH",
          body: JSON.stringify({ statecode: 0, statuscode: 1 }),
        });
      } else {
        // Same label the MDA form script writes: "<Campaign> - <Source>".
        await dataverseFetch(CONTEST_SOURCE_CAPS_SET, {
          method: "POST",
          body: JSON.stringify({
            andy_settingname: `${toCampaign(campaign, []).name} - ${toSource(source).name}`,
            [`${SOURCE_CAP_CAMPAIGN_NAV}@odata.bind`]: `/${CONTEST_CAMPAIGNS_SET}(${campaignId})`,
            [`${SOURCE_CAP_SOURCE_NAV}@odata.bind`]: `/${CONTEST_SOURCES_SET}(${sourceId})`,
          }),
        });
      }
    }
  } else {
    for (const cap of existing.filter((row) => row.statecode === 0)) {
      await dataverseFetch(`${CONTEST_SOURCE_CAPS_SET}(${cap.andy_contestsourcecapid})`, {
        method: "PATCH",
        body: JSON.stringify({ statecode: 1, statuscode: 2 }),
      });
    }
  }
  return summarize(campaignId);
}

async function summarize(campaignId: string): Promise<CampaignSummary> {
  const [campaign, caps] = await Promise.all([fetchCampaign(campaignId), listActiveCaps()]);
  if (!campaign) throw new CampaignNotFoundError("Unknown campaign");
  return toCampaign(campaign, sourceIdsFor(caps, campaignId));
}

function assertGuid(value: string, field: string): void {
  if (!isGuidLike(value)) throw new Error(`${field} must be a GUID`);
}
