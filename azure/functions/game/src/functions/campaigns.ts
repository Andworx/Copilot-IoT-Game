import { registerHttp } from "../lib/apiSurface";
import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { listCampaignOverview } from "../lib/campaigns";

/**
 * GET /api/campaigns -- active Contest Campaigns (newest first: the first is the one the games use),
 * each with the ids of its connected Contest Sources, plus the catalog of active sources. Powers
 * Game Box Control's Campaigns screen, the staff view of the Prize Engine app's "Campaign to Source".
 * Entra staff-role gated like the other staff reads of campaign data.
 */
export async function campaigns(_request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    return { jsonBody: await listCampaignOverview() };
  } catch (error) {
    context.error("campaigns failed", error);
    return { status: 500, jsonBody: { error: "Failed to list campaigns" } };
  }
}

registerHttp("campaigns", {
  route: "campaigns",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: campaigns,
});
