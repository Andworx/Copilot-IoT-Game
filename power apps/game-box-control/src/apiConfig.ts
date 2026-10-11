import { getClient } from "@microsoft/power-apps/data";

/** Operation IDs must match the staff custom connector's OpenAPI definition. */
export const staffOperations: Record<string, string> = {
  "GET /api/device-profiles": "GetDeviceProfiles",
  "GET /api/kiosk-state": "GetKioskState",
  "POST /api/set-mode": "SetMode",
  "POST /api/toggle-device": "ToggleDevice",
  "POST /api/set-game-mode": "SetGameMode",
  "GET /api/prize-types": "GetPrizeTypes",
  "GET /api/prize-count": "GetPrizeCount",
  "POST /api/bulk-create-prizes": "BulkCreatePrizes",
  "POST /api/grand-prize/check-in": "GrandPrizeCheckIn",
  "GET /api/grand-prize/drawing-slices": "GetDrawingSlices",
  "GET /api/grand-prize/drawing-state": "GetDrawingState",
  "POST /api/grand-prize/draw": "DrawGrandPrize",
  "POST /api/create-win": "CreateTestWin",
  "POST /api/claim-prize": "ClaimTestPrize",
};

/**
 * Operations added after the staff connector was first registered. They are optional: the app keeps
 * working before the connector is updated, and the matching controls explain what is missing.
 */
export const optionalStaffOperations: Record<string, string> = {
  "POST /api/plinko-game-mode": "PlinkoGameMode",
};

export class StaffOperationUnavailableError extends Error {
  constructor() {
    super("This control needs the staff connector to be updated. Ask the app administrator.");
  }
}

type Sources = Parameters<typeof getClient>[0];
// PAC generates this metadata when the real OAuth connector is added. PR builds
// can run without bindings; deployment preflight must reject missing bindings.
// There is deliberately no direct-fetch or Function-key fallback.
const generated = import.meta.glob<{ dataSourcesInfo: Sources }>(
  "../.power/schemas/appschemas/dataSourcesInfo.ts", { eager: true },
);
let binding: { client: ReturnType<typeof getClient>; tableName: string; apis: Record<string, unknown> } | undefined;

function staffBinding() {
  if (binding) return binding;
  const sources = Object.values(generated)[0]?.dataSourcesInfo;
  const candidates = Object.entries(sources ?? {}).filter(([, source]) =>
    Object.values(staffOperations).every(operation => operation in source.apis),
  );
  if (!sources || candidates.length !== 1) {
    throw new Error("The staff connection is not configured. Ask the app administrator to finish setup.");
  }
  binding = { client: getClient(sources), tableName: candidates[0][0], apis: candidates[0][1].apis as Record<string, unknown> };
  return binding;
}

/** OAuth tokens are handled by the Power Apps connection, never shipped in JS. */
export async function staffRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const key = `${init.method ?? "GET"} ${path}`;
  const operationName = staffOperations[key] ?? optionalStaffOperations[key];
  if (!operationName) throw new Error("Unsupported staff operation.");
  const { client, tableName, apis } = staffBinding();
  if (key in optionalStaffOperations && !(operationName in apis)) throw new StaffOperationUnavailableError();
  const result = await client.executeAsync<{ body?: unknown }, unknown>({
    connectorOperation: {
      tableName, operationName,
      parameters: init.body ? { body: JSON.parse(String(init.body)) } : {},
    },
  });
  if (!result.success) {
    // Connector errors can contain URLs or participant data; do not echo them.
    throw new Error("The staff request failed. Check your connection and operator access, then try again.");
  }
  return new Response(JSON.stringify(result.data ?? null), { headers: { "Content-Type": "application/json" } });
}
