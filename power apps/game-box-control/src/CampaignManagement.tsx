import { useCallback, useEffect, useState } from "react";
import { StaffOperationUnavailableError, staffRequest } from "./apiConfig";

interface Source {
  id: string;
  key: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  maxEntries: number | null;
  sourceIds: string[];
}

const MIN_ENTRIES = 1;
const MAX_ENTRIES = 100;

/**
 * Campaign management: the staff view of the Prize Engine app's "Campaign to Source" connections
 * (a Source Cap row per campaign/source pair) and each campaign's Max Entries per Contact. Games
 * award entries against the active campaign, so these are campaign settings, not per-game ones.
 * The first campaign listed is the newest active one, which is the campaign the games use.
 */
export default function CampaignManagement() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await staffRequest("/api/campaigns");
      if (!res.ok) throw new Error(`campaigns failed: ${res.status}`);
      const body = (await res.json()) as { campaigns: Campaign[]; sources: Source[] };
      setCampaigns(body.campaigns);
      setSources(body.sources);
      setSelectedId((current) => (body.campaigns.some((c) => c.id === current) ? current : body.campaigns[0]?.id ?? ""));
    } catch (err) {
      setMessage(err instanceof StaffOperationUnavailableError ? err.message : "Could not load the campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  async function update(key: string, change: Record<string, unknown>, failure: string) {
    if (!selected) return;
    setBusyKey(key);
    setMessage(null);
    try {
      const res = await staffRequest("/api/campaign-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: selected.id, ...change }),
      });
      if (!res.ok) throw new Error(`campaign-update failed: ${res.status}`);
      const body = (await res.json()) as { campaign?: Campaign } | null;
      const next = body?.campaign;
      if (!next) throw new Error("Unexpected campaign response");
      setCampaigns((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    } catch (err) {
      setMessage(err instanceof StaffOperationUnavailableError ? err.message : failure);
    } finally {
      setBusyKey(null);
    }
  }

  function changeMaxEntries(maxEntries: number) {
    if (!Number.isInteger(maxEntries) || maxEntries < MIN_ENTRIES || maxEntries > MAX_ENTRIES) return;
    void update("max", { maxEntries }, "Could not save the max entries.");
  }

  function toggleSource(source: Source, linked: boolean) {
    void update(source.id, { sourceId: source.id, linked }, `Could not ${linked ? "connect" : "disconnect"} ${source.name}.`);
  }

  const busy = busyKey !== null;

  return (
    <>
      <div className="section-heading">
        <div><p className="eyebrow">CAMPAIGN</p><h2>Campaign to source</h2></div>
        <button className="refresh-button" disabled={loading || busy} onClick={() => void load()}>{loading ? "Refreshing..." : "Refresh state"}</button>
      </div>
      {message && <p role="alert" className="campaign-alert">{message}</p>}
      <div className="control-panel">
        {loading ? (
          <p>Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="section-description">No active campaigns. Create one in the Prize Engine app first.</p>
        ) : (
          <>
            <div className="game-selector campaign-selector">
              <div>
                <label htmlFor="campaign-select">Campaign</label>
                <select id="campaign-select" value={selectedId} disabled={busy} onChange={(e) => setSelectedId(e.target.value)}>
                  {campaigns.map((c, index) => (
                    <option key={c.id} value={c.id}>{c.name}{index === 0 ? " (current)" : ""}</option>
                  ))}
                </select>
              </div>
              <p>Games award entries against the current (newest active) campaign. Connect the sources that may enter people into the selected one.</p>
            </div>

            {selected && (
              <>
                <div className="bucket-config-row campaign-row" aria-label="Campaign max entries">
                  <div className="bucket-config-label">Max entries per contact</div>
                  <div className="bucket-icon-options">
                    <button type="button" className="refresh-button" disabled={busy || (selected.maxEntries ?? MIN_ENTRIES + 1) <= MIN_ENTRIES} onClick={() => changeMaxEntries((selected.maxEntries ?? MIN_ENTRIES + 1) - 1)} aria-label="Decrease max entries">−</button>
                    <strong aria-live="polite">{selected.maxEntries ?? "–"}</strong>
                    <button type="button" className="refresh-button" disabled={busy || (selected.maxEntries ?? 0) >= MAX_ENTRIES} onClick={() => changeMaxEntries((selected.maxEntries ?? MIN_ENTRIES - 1) + 1)} aria-label="Increase max entries">+</button>
                  </div>
                </div>
                <p className="section-description">Also what a Plinko lit bucket awards while this is the current campaign.</p>

                <h3>Connected sources</h3>
                <p className="section-description">A source can add entries to this campaign only while it is connected.</p>
                {sources.length === 0 ? (
                  <p className="section-description">No sources defined yet.</p>
                ) : (
                  <ul className="source-list">
                    {sources.map((source) => {
                      const linked = selected.sourceIds.some((id) => id.toLowerCase() === source.id.toLowerCase());
                      return (
                        <li key={source.id} className="source-row" data-linked={linked}>
                          <div>
                            <div className="source-name">{source.name}</div>
                            <div className="source-key">{source.key}</div>
                          </div>
                          <button
                            type="button"
                            className="refresh-button source-toggle"
                            disabled={busy}
                            aria-pressed={linked}
                            aria-label={`${linked ? "Disconnect" : "Connect"} ${source.name}`}
                            onClick={() => toggleSource(source, !linked)}
                          >
                            {busyKey === source.id ? "Saving…" : linked ? "Connected — Disconnect" : "Connect"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
