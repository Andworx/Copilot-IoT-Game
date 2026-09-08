import { ConfidentialClientApplication } from "@azure/msal-node";

const DATAVERSE_URL = (process.env.DATAVERSE_URL ?? "").replace(/\/$/, "");

const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.DATAVERSE_CLIENT_ID ?? "",
    authority: `https://login.microsoftonline.com/${process.env.DATAVERSE_TENANT_ID ?? ""}`,
    clientSecret: process.env.DATAVERSE_CLIENT_SECRET ?? "",
  },
});

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.value;
  }
  const result = await msalClient.acquireTokenByClientCredential({
    scopes: [`${DATAVERSE_URL}/.default`],
  });
  if (!result?.accessToken) {
    throw new Error("Failed to acquire a Dataverse access token");
  }
  cachedToken = {
    value: result.accessToken,
    expiresAt: result.expiresOn ? result.expiresOn.getTime() : now + 60 * 60 * 1000,
  };
  return cachedToken.value;
}

async function dataverseFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const response = await fetch(`${DATAVERSE_URL}/api/data/v9.2/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "OData-MaxVersion": "4.0",
      "OData-Version": "4.0",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dataverse ${init.method ?? "GET"} ${path} failed: ${response.status} ${body}`);
  }
  return response;
}

export interface GameBoxState {
  id: string;
  deviceSlug: string | null;
  deviceName: string | null;
}

// The andy_activedeviceprofile lookup's OData *navigation property* name is
// andy_ActiveDeviceProfile -- confirmed against this environment's real
// EntityDefinitions metadata, not just the (lowercase) attribute logical
// name. $expand, @odata.bind, and $ref operations all need this exact
// casing; only plain $select of the raw FK value would use the lowercase
// attribute name, which this file doesn't currently do.
const ACTIVE_DEVICE_PROFILE_NAV_PROPERTY = "andy_ActiveDeviceProfile";

/** Reads the andy_gameboxstate singleton row. Throws if the row hasn't been created yet. */
export async function getGameBoxState(): Promise<GameBoxState> {
  const response = await dataverseFetch(
    "andy_gameboxstates?$top=1&$select=andy_gameboxstateid" +
      `&$expand=${ACTIVE_DEVICE_PROFILE_NAV_PROPERTY}($select=andy_deviceslug,andy_name)`
  );
  const body = (await response.json()) as {
    value: Array<{
      andy_gameboxstateid: string;
      [ACTIVE_DEVICE_PROFILE_NAV_PROPERTY]?: { andy_deviceslug?: string; andy_name?: string } | null;
    }>;
  };
  const row = body.value[0];
  if (!row) {
    throw new Error("andy_gameboxstate has no rows -- create the single row before using this API");
  }
  const activeDevice = row[ACTIVE_DEVICE_PROFILE_NAV_PROPERTY];
  return {
    id: row.andy_gameboxstateid,
    deviceSlug: activeDevice?.andy_deviceslug ?? null,
    deviceName: activeDevice?.andy_name ?? null,
  };
}

/** Sets or clears andy_gameboxstate's active device lookup. Pass null to return to demo/info. */
export async function setActiveDeviceProfile(
  gameBoxStateId: string,
  deviceProfileId: string | null
): Promise<void> {
  if (deviceProfileId) {
    await dataverseFetch(`andy_gameboxstates(${gameBoxStateId})`, {
      method: "PATCH",
      body: JSON.stringify({
        [`${ACTIVE_DEVICE_PROFILE_NAV_PROPERTY}@odata.bind`]: `/andy_deviceprofiles(${deviceProfileId})`,
      }),
    });
  } else {
    // Clearing a single-valued lookup is a $ref DELETE, not a PATCH-to-null.
    await dataverseFetch(
      `andy_gameboxstates(${gameBoxStateId})/${ACTIVE_DEVICE_PROFILE_NAV_PROPERTY}/$ref`,
      { method: "DELETE" }
    );
  }
}
