import { apiSurface, backgroundWorkEnabled } from "../lib/apiSurface";
import { app, output, InvocationContext, RetryOptions } from "@azure/functions";
import { createTelemetryEvent } from "../lib/dataverse";
import {
  buildSignalRMessages,
  parsePayload,
  resolveDeviceId,
  shouldLog,
  toTelemetryRecord,
  type SignalRMessage,
} from "../lib/telemetry";

/**
 * Panel Pi telemetry pipeline (GAME_MODE_PLAN.md §1):
 *
 *   Pi -> IoT Hub -> built-in Event Hub endpoint -> this trigger -> SignalR (gamebox hub)
 *                                                               -> andy_iottelemetryevent
 *
 * The kiosk page receives `SendTelemetryUpdate` (every reading) and `TriggerAgentHelp`
 * (readings where the panel isn't restored) on the same hub it already uses for
 * deviceChanged. A Dataverse failure never blocks the SignalR broadcast.
 *
 * Settings: IoTHubEventHubConnectionString (Event Hub-compatible endpoint connection
 * string), IOT_EVENTHUB_NAME, IOT_EVENTHUB_CONSUMER_GROUP. The consumer group must be
 * dedicated to this Function App -- sharing one with another reader (for example the
 * sibling copilot-iot-service app's `funcapp` group) splits partition leases and each
 * app then misses events.
 *
 * The SignalR output binding's actual HTTP call to the SignalR service happens in the
 * WebJobs host after this handler already returned, so a failure there (seen live: 429
 * Too Many Requests from a burst of rapid panel state changes) can't be caught here --
 * `retry` below is the supported fix (see Microsoft's Azure Functions error-handling
 * guidance): the Event Hubs extension only checkpoints a batch once the retry policy
 * finishes, so a throttled/dropped broadcast gets the whole batch replayed instead of
 * silently losing that update. This can replay a `createTelemetryEvent` write too (a
 * harmless duplicate append-only log row) alongside the SignalR broadcast it's retrying
 * for; `andy_iottelemetryevent` is a log, not a state store, so that's an acceptable
 * trade-off for not dropping kiosk updates.
 */
const retryPolicy: RetryOptions = {
  strategy: "exponentialBackoff",
  maxRetryCount: 5,
  minimumInterval: { seconds: 2 },
  maximumInterval: { seconds: 30 },
};
const signalROutput = output.generic({
  type: "signalR",
  name: "signalRMessages",
  hubName: "gamebox",
  connectionStringSetting: "AzureSignalRConnectionString",
});

export async function iotTelemetry(events: unknown[], context: InvocationContext): Promise<void> {
  if (!Array.isArray(events) || events.length === 0) return;

  const systemProperties = context.triggerMetadata?.systemPropertiesArray as
    | Array<Record<string, unknown>>
    | undefined;

  const signalRMessages: SignalRMessage[] = [];
  const dataverseWrites: Promise<void>[] = [];

  events.forEach((event, index) => {
    const payload = parsePayload(event);
    if (!payload) {
      context.warn("Skipping an Event Hub event that is not a JSON object");
      return;
    }
    const deviceId = resolveDeviceId(payload, systemProperties?.[index]);
    signalRMessages.push(...buildSignalRMessages(payload, deviceId));

    // Only real events get a history row (state changes and wins), not heartbeats or mode changes.
    if (shouldLog(payload)) {
      dataverseWrites.push(
        createTelemetryEvent(toTelemetryRecord(payload, deviceId)).catch((error) => {
          context.warn(`Dataverse telemetry write failed (non-blocking): ${String(error)}`);
        })
      );
    }
  });

  if (signalRMessages.length > 0) {
    context.extraOutputs.set(signalROutput, signalRMessages);
    context.log(`Broadcast ${signalRMessages.length} SignalR message(s) for ${events.length} event(s)`);
  }

  // Await the writes so the worker isn't recycled mid-request.
  await Promise.all(dataverseWrites);
}

if (apiSurface() === "public" && backgroundWorkEnabled()) app.eventHub("iot-telemetry", {
  connection: "IoTHubEventHubConnectionString",
  eventHubName: process.env.IOT_EVENTHUB_NAME ?? "iot-telemetry",
  consumerGroup: process.env.IOT_EVENTHUB_CONSUMER_GROUP ?? "$Default",
  cardinality: "many",
  extraOutputs: [signalROutput],
  retry: retryPolicy,
  handler: iotTelemetry,
});
