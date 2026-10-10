import { app, InvocationContext, Timer } from "@azure/functions";
import { apiSurface, backgroundWorkEnabled } from "../lib/apiSurface";
import { runFollowUps, runRetention } from "../lib/consentMaintenance";

/**
 * Daily job (14:00 UTC): post-event follow-up emails, then 90-day retention. Registered on the
 * staff app only so it runs once; both steps are safe to re-run (docs/PREFERENCE_CENTER_DESIGN.md).
 */
export async function consentMaintenance(_timer: Timer, context: InvocationContext): Promise<void> {
  const followUps = await runFollowUps();
  context.log("consent-maintenance follow-ups", followUps);
  const retention = await runRetention();
  context.log("consent-maintenance retention", retention);
}

if (apiSurface() === "staff" && backgroundWorkEnabled()) {
  app.timer("consent-maintenance", { schedule: "0 0 14 * * *", handler: consentMaintenance });
}
