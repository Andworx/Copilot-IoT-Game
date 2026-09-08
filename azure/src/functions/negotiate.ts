import { app, input, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

/**
 * SignalR connection bootstrap. The kiosk SPA calls this once on load to get a
 * URL + access token for connecting directly to Azure SignalR Service -- it
 * never talks to this Function App again except for GET /api/kiosk-state.
 */
const signalRConnectionInfo = input.generic({
  type: "signalRConnectionInfo",
  name: "connectionInfo",
  hubName: "gamebox",
  connectionStringSetting: "AzureSignalRConnectionString",
});

export async function negotiate(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  return { jsonBody: context.extraInputs.get(signalRConnectionInfo) };
}

app.http("negotiate", {
  route: "negotiate",
  methods: ["POST"],
  authLevel: "anonymous",
  extraInputs: [signalRConnectionInfo],
  handler: negotiate,
});
