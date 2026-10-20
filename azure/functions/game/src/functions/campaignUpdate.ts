import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { CampaignNotFoundError, setCampaignMaxEntries, setCampaignSourceLinked } from "../lib/campaigns";
import { isGuidLike } from "../lib/dataverse";

/**
 * POST /api/campaign-update { campaignId, maxEntries? } or { campaignId, sourceId, linked } -- Game Box
 * Control's Campaigns screen. `maxEntries` sets the campaign's Max Entries per Contact; `sourceId` +
 * `linked` connects or disconnects a Contest Source (an active Source Cap row, as in the Prize Engine
 * app). Returns the updated campaign. Entra staff-role gated.
 */
export async function campaignUpdate(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: { campaignId?: unknown; maxEntries?: unknown; sourceId?: unknown; linked?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return { status: 400, jsonBody: { error: "Invalid JSON body" } };
  }
  if (typeof body.campaignId !== "string" || !isGuidLike(body.campaignId)) {
    return { status: 400, jsonBody: { error: "campaignId must be a GUID" } };
  }
  const hasMax = body.maxEntries !== undefined;
  const hasLink = body.sourceId !== undefined || body.linked !== undefined;
  if (hasMax === hasLink) {
    return { status: 400, jsonBody: { error: "Send either maxEntries, or sourceId with linked" } };
  }
  if (hasMax && (typeof body.maxEntries !== "number" || !Number.isInteger(body.maxEntries) || body.maxEntries < 1 || body.maxEntries > 100)) {
    return { status: 400, jsonBody: { error: "maxEntries must be a whole number between 1 and 100" } };
  }
  if (hasLink && (typeof body.sourceId !== "string" || !isGuidLike(body.sourceId) || typeof body.linked !== "boolean")) {
    return { status: 400, jsonBody: { error: "sourceId must be a GUID and linked a boolean" } };
  }

  try {
    const campaign = hasMax
      ? await setCampaignMaxEntries(body.campaignId, body.maxEntries as number)
      : await setCampaignSourceLinked(body.campaignId, body.sourceId as string, body.linked as boolean);
    return { jsonBody: { campaign } };
  } catch (error) {
    if (error instanceof CampaignNotFoundError) return { status: 404, jsonBody: { error: error.message } };
    context.error("campaign-update failed", error);
    return { status: 500, jsonBody: { error: "Failed to update the campaign" } };
  }
}

registerHttp("campaign-update", {
  route: "campaign-update",
  methods: ["POST"],
  authLevel: "anonymous",
  handler: campaignUpdate,
});
