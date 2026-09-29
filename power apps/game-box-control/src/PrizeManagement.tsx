import { useCallback, useEffect, useState } from "react";
import { staffRequest } from "./apiConfig";

interface PrizeType {
  id: string;
  name: string;
}

interface CreatedPrize {
  id: string;
  name: string;
  createdAt: string;
}

interface PrizeTypeCount {
  typeId: string;
  typeName: string;
  total: number;
  available: number;
}

interface PrizeCounts {
  total: number;
  available: number;
  byType?: PrizeTypeCount[];
}

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100;

/**
 * Bulk-create andy_Prizes instance rows without leaving Game Box Control. Same
 * capability as the "Bulk Add Prizes" genpage in the Game Backend app
 * (power apps/bulk-add-prizes/bulk-add-prizes.tsx), ported to call the azure/
 * Functions backend (POST /api/bulk-create-prizes) instead of the genpage's direct
 * Dataverse dataApi -- Game Box Control has no genpage context, and this keeps it on
 * the same authenticated connector as its existing mode controls. The genpage
 * itself is left running as a redundant alternate entry point.
 */
export default function PrizeManagement() {
  const [prizeTypes, setPrizeTypes] = useState<PrizeType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [created, setCreated] = useState<CreatedPrize[]>([]);
  // null while unknown (still loading) or on a failed fetch -- rendered as "—" rather
  // than a misleading 0, since 0 is a real, alarm-worthy state (empty prize pool).
  const [counts, setCounts] = useState<PrizeCounts | null>(null);

  const loadPrizeTypes = useCallback(async () => {
    setTypesLoading(true);
    try {
      const res = await staffRequest("/api/prize-types");
      if (!res.ok) throw new Error(`prize-types failed: ${res.status}`);
      const body = (await res.json()) as { prizeTypes: PrizeType[] };
      setPrizeTypes(body.prizeTypes);
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to load prize types",
      });
    } finally {
      setTypesLoading(false);
    }
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const res = await staffRequest("/api/prize-count");
      if (!res.ok) throw new Error(`prize-count failed: ${res.status}`);
      const body = (await res.json()) as PrizeCounts;
      setCounts(body);
    } catch (err) {
      console.error("Failed to load prize counts", err);
      setCounts(null);
    }
  }, []);

  useEffect(() => {
    loadPrizeTypes();
    loadCounts();
  }, [loadPrizeTypes, loadCounts]);

  async function handleCreate() {
    const selectedType = prizeTypes.find((t) => t.id === selectedTypeId);
    if (!selectedType) {
      setMessage({ kind: "error", text: "Select a prize type." });
      return;
    }
    if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
      setMessage({
        kind: "error",
        text: `Enter a whole number between ${MIN_QUANTITY} and ${MAX_QUANTITY}.`,
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const res = await staffRequest("/api/bulk-create-prizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prizeTypeId: selectedType.id,
          prizeTypeName: selectedType.name,
          quantity,
        }),
      });
      if (!res.ok) throw new Error(`bulk-create-prizes failed: ${res.status}`);
      const body = (await res.json()) as { created: Array<{ id: string; name: string }> };
      const createdAt = new Date().toLocaleString();
      setCreated((prev) => [
        ...body.created.map((p) => ({ ...p, createdAt })),
        ...prev,
      ]);
      setMessage({
        kind: "success",
        text: `Created ${body.created.length} ${body.created.length === 1 ? "prize" : "prizes"} of type "${selectedType.name}".`,
      });
      setQuantity(MIN_QUANTITY);
      loadCounts();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Failed to create prizes" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 8,
        padding: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "0.25rem" }}>Prize Management</h2>
      <p style={{ color: "#555", marginTop: 0, fontSize: "0.9rem" }}>
        Pick a prize type and quantity to add new prizes to the pool.
      </p>

      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          padding: "0.75rem 1rem",
          borderRadius: 6,
          border: "1px solid #e5e7eb",
          background: "#f9fafb",
          marginBottom: "1rem",
          fontSize: "0.9rem",
        }}
      >
        <div>
          <span style={{ color: "#555" }}>Total prizes: </span>
          <strong>{counts === null ? "—" : counts.total}</strong>
        </div>
        <div>
          <span style={{ color: "#555" }}>Available: </span>
          <strong>{counts === null ? "—" : counts.available}</strong>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
          Prize type quantities
        </div>
        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                <th style={{ padding: "0.4rem 0.6rem" }}>Prize type</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>Total</th>
                <th style={{ padding: "0.4rem 0.6rem" }}>Available</th>
              </tr>
            </thead>
            <tbody>
              {counts === null ? (
                <tr>
                  <td style={{ padding: "0.4rem 0.6rem", color: "#555" }} colSpan={3}>
                    Loading prize quantities…
                  </td>
                </tr>
              ) : counts.byType && counts.byType.length > 0 ? (
                counts.byType.map((type) => (
                  <tr key={type.typeId}>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{type.typeName}</td>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{type.total}</td>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{type.available}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: "0.4rem 0.6rem", color: "#555" }} colSpan={3}>
                    No prize types found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {message && (
        <p
          style={{
            background: message.kind === "success" ? "#f0fdf4" : "#fdecea",
            color: message.kind === "success" ? "#166534" : "#611a15",
            padding: "0.6rem 0.8rem",
            borderRadius: 6,
            fontSize: "0.9rem",
          }}
        >
          {message.text}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: "2 1 200px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Prize type</span>
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            disabled={typesLoading || submitting}
            style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
          >
            <option value="">{typesLoading ? "Loading…" : "Select a prize type"}</option>
            {prizeTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: "1 1 100px" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Quantity</span>
          <input
            type="number"
            min={MIN_QUANTITY}
            max={MAX_QUANTITY}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || MIN_QUANTITY)}
            disabled={submitting}
            style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #d1d5db" }}
          />
        </label>

        <button
          onClick={handleCreate}
          disabled={submitting || typesLoading}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: 6,
            border: "none",
            fontWeight: 600,
            color: "#fff",
            background: "#2563eb",
            cursor: submitting ? "wait" : "pointer",
            opacity: submitting || typesLoading ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {submitting ? "Creating…" : "Create prizes"}
        </button>
      </div>

      {created.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
            Created this session ({created.length})
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 6 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                  <th style={{ padding: "0.4rem 0.6rem" }}>Prize name</th>
                  <th style={{ padding: "0.4rem 0.6rem" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {created.map((p) => (
                  <tr key={p.id || `${p.name}-${p.createdAt}`}>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{p.name}</td>
                    <td style={{ padding: "0.4rem 0.6rem" }}>{p.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
