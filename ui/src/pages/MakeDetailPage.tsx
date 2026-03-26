import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getMake,
  completeMake,
  getMakeSales,
  getMakeMaterials,
  addMakeMaterial,
  removeMakeMaterial,
  getMaterials,
} from "../services/inventoryApi";
import { Make, SaleLog, MakeMaterial, RawMaterial } from "../types/inventory";
import LogMakeSaleModal from "../components/inventory/LogMakeSaleModal";
import "../styles/inventory.css";

export default function MakeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [make, setMake] = useState<Make | null>(null);
  const [sales, setSales] = useState<SaleLog[]>([]);
  const [materials, setMaterials] = useState<MakeMaterial[]>([]);
  const [allMaterials, setAllMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogSale, setShowLogSale] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  // sale filters
  const [filterTagIds, setFilterTagIds] = useState<number[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchAll = async () => {
    if (!id) return;
    try {
      const [makeData, salesData, materialsData, allMatsData] = await Promise.all([
        getMake(Number(id)),
        getMakeSales(Number(id)),
        getMakeMaterials(Number(id)),
        getMaterials(),
      ]);
      setMake(makeData);
      setSales(salesData.results ?? salesData);
      setMaterials(materialsData.results ?? materialsData);
      setAllMaterials(allMatsData.results ?? allMatsData);
    } catch {
      toast.error("Failed to load make");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchSales = async () => {
    if (!id) return;
    try {
      const data = await getMakeSales(Number(id), {
        tags: filterTagIds.length ? filterTagIds : undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
      });
      setSales(data.results ?? data);
    } catch {
      toast.error("Failed to load sales");
    }
  };

  useEffect(() => {
    if (make) fetchSales();
  }, [filterTagIds, filterDateFrom, filterDateTo]);

  const handleRemoveMaterial = async (materialId: number) => {
    if (!id) return;
    const confirmed = window.confirm("Remove this material from the make?");
    if (!confirmed) return;
    try {
      await removeMakeMaterial(Number(id), materialId);
      toast.success("Material removed");
      fetchAll();
    } catch {
      toast.error("Failed to remove material");
    }
  };

  if (loading) return <div className="inv-empty">Loading...</div>;
  if (!make) return <div className="inv-empty">Make not found.</div>;

  // collect all unique tags from sales for filter
  const allTags = Array.from(
    new Map(
      sales.flatMap((s) => s.tags).map((t) => [t.id, t])
    ).values()
  );

  const totalSold = sales.reduce((sum, s) => sum + s.units_sold, 0);

  return (
    <div className="inventory-page">
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          className="inv-btn"
          onClick={() => navigate("/inventory")}
        >
          ← Back
        </button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 500, margin: 0 }}>
          {make.name}
        </h1>
      </div>

      {/* summary cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "1rem",
        marginBottom: "2rem",
      }}>
        {[
          { label: "Units Produced", value: make.units_produced },
          { label: "Available", value: make.available_units },
          { label: "Sold", value: make.units_sold },
          { label: "Date Made", value: make.date_made ?? "—" },
          {
            label: "Linked Product",
            value: make.product_title ?? "None",
            link: make.product ? `/products/${make.product}/edit` : null,
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: "1rem",
              borderRadius: "var(--border-radius-lg)",
              border: "1px solid var(--color-border-tertiary)",
              background: "var(--color-background-secondary)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.35rem" }}>
              {card.label}
            </div>
            {card.link ? (
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-text-primary)",
                  fontWeight: 500,
                  fontSize: "1rem",
                  padding: 0,
                }}
                onClick={() => navigate(card.link!)}
              >
                {card.value}
              </button>
            ) : (
              <div style={{ fontSize: "1rem", fontWeight: 500 }}>{card.value}</div>
            )}
          </div>
        ))}
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="inv-btn inv-btn--primary"
          onClick={() => setShowCompleteModal(true)}
        >
          Log Make
        </button>
        <button
          type="button"
          className="inv-btn"
          onClick={() => setShowLogSale(true)}
          disabled={make.available_units === 0}
        >
          Log Sale
        </button>
      </div>

      {make.notes && (
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: "var(--border-radius-md)",
          background: "var(--color-background-secondary)",
          border: "1px solid var(--color-border-tertiary)",
          fontSize: "0.875rem",
          color: "var(--color-text-secondary)",
          marginBottom: "2rem",
        }}>
          {make.notes}
        </div>
      )}

      {/* materials section */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div className="inv-toolbar">
          <h2 style={{ fontSize: "1rem", fontWeight: 500, margin: 0 }}>Materials Used</h2>
          <button
            type="button"
            className="inv-btn inv-btn--sm"
            onClick={() => setShowAddMaterial(true)}
          >
            + Add Material
          </button>
        </div>

        {materials.length === 0 ? (
          <div className="inv-empty" style={{ padding: "1.5rem" }}>
            No materials linked yet.
          </div>
        ) : (
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Unit Type</th>
                  <th>Quantity Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mm) => (
                  <tr key={mm.id}>
                    <td>{mm.material_name}</td>
                    <td>{mm.material_unit_type}</td>
                    <td>
                      {mm.quantity_used !== null
                        ? `${mm.quantity_used} ${mm.material_unit_type}`
                        : <span style={{ color: "var(--color-text-tertiary)" }}>not set</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm inv-btn--danger"
                        onClick={() => handleRemoveMaterial(mm.material)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* sales history section */}
      <section>
        <div className="inv-toolbar" style={{ marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 500, margin: 0 }}>
            Sales History
            <span style={{
              marginLeft: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: 400,
              color: "var(--color-text-secondary)",
            }}>
              {totalSold} sold total
            </span>
          </h2>
        </div>

        {/* filters */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {allTags.length > 0 && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Filter by tag:</span>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="inv-tag"
                  style={
                    filterTagIds.includes(tag.id)
                      ? { background: "var(--color-text-primary)", color: "var(--color-background-primary)" }
                      : {}
                  }
                  onClick={() =>
                    setFilterTagIds((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((t) => t !== tag.id)
                        : [...prev, tag.id]
                    )
                  }
                >
                  {tag.name}
                </button>
              ))}
              {filterTagIds.length > 0 && (
                <button
                  type="button"
                  className="inv-btn inv-btn--sm"
                  onClick={() => setFilterTagIds([])}
                >
                  Clear
                </button>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>From:</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", border: "1px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
            />
            <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>To:</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem", border: "1px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
            />
            {(filterDateFrom || filterDateTo) && (
              <button
                type="button"
                className="inv-btn inv-btn--sm"
                onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="inv-empty" style={{ padding: "1.5rem" }}>
            No sales logged yet.
          </div>
        ) : (
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Units Sold</th>
                  <th>Source</th>
                  <th>Tags</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.sale_date}</td>
                    <td>{sale.units_sold}</td>
                    <td>
                      <span className={`inv-badge ${sale.source === "etsy" ? "inv-badge--info" : "inv-badge--neutral"}`}>
                        {sale.source === "etsy" ? "Etsy" : "Manual"}
                      </span>
                    </td>
                    <td>
                      {sale.tags.length > 0
                        ? sale.tags.map((t) => (
                            <span key={t.id} className="inv-tag">{t.name}</span>
                          ))
                        : "—"}
                    </td>
                    <td>{sale.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* modals */}
      {showLogSale && (
        <LogMakeSaleModal
          make={make}
          onClose={() => setShowLogSale(false)}
          onLogged={() => { setShowLogSale(false); fetchAll(); }}
        />
      )}

      {showCompleteModal && (
        <CompleteMakeModal
          make={make}
          onClose={() => setShowCompleteModal(false)}
          onCompleted={() => { setShowCompleteModal(false); fetchAll(); }}
        />
      )}

      {showAddMaterial && (
        <AddMaterialModal
          makeId={make.id}
          allMaterials={allMaterials}
          existingMaterialIds={materials.map((m) => m.material)}
          onClose={() => setShowAddMaterial(false)}
          onAdded={() => { setShowAddMaterial(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

// ── Complete Make Modal ──────────────────────────────────────

type CompleteProps = {
  make: Make;
  onClose: () => void;
  onCompleted: () => void;
};

function CompleteMakeModal({ make, onClose, onCompleted }: CompleteProps) {
  const [unitsProduced, setUnitsProduced] = useState(make.units_produced || 1);
  const [deductMaterials, setDeductMaterials] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const hasMaterialQuantities = make.make_materials.some(
    (m) => m.quantity_used !== null
  );

  const handleComplete = async () => {
    setSaving(true);
    try {
      await completeMake(make.id, unitsProduced, deductMaterials, notes || undefined);
      toast.success("Make completed");
      onCompleted();
    } catch {
      toast.error("Failed to complete make");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal">
        <div className="inv-modal__header">
          <span className="inv-modal__title">Log Make - {make.name}</span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal__body">
          <div className="inv-field">
            <label>Units Produced</label>
            <input
              type="number"
              min="0"
              value={unitsProduced}
              onChange={(e) => setUnitsProduced(Number(e.target.value))}
            />
            <span className="inv-field__hint">
                This will be added to the total units produced and the linked product's quantity.
            </span>
          </div>

          {hasMaterialQuantities && (
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={deductMaterials}
                onChange={(e) => setDeductMaterials(e.target.checked)}
              />
              Deduct materials from stock
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)" }}>
                (only materials with quantities set will be deducted)
              </span>
            </label>
          )}

          <div className="inv-field">
            <label>Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="inv-modal__footer">
          <button type="button" className="inv-btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="inv-btn inv-btn--primary"
            onClick={handleComplete}
            disabled={saving}
          >
            {saving ? "Logging..." : "Log Make"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Material Modal ───────────────────────────────────────

type AddMaterialProps = {
  makeId: number;
  allMaterials: RawMaterial[];
  existingMaterialIds: number[];
  onClose: () => void;
  onAdded: () => void;
};

function AddMaterialModal({
  makeId,
  allMaterials,
  existingMaterialIds,
  onClose,
  onAdded,
}: AddMaterialProps) {
  const available = allMaterials.filter(
    (m) => !existingMaterialIds.includes(m.id)
  );
  const [materialId, setMaterialId] = useState<number | "">(
    available[0]?.id ?? ""
  );
  const [quantityUsed, setQuantityUsed] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedMaterial = allMaterials.find((m) => m.id === materialId);

  const handleAdd = async () => {
    if (!materialId) { toast.error("Select a material"); return; }
    setSaving(true);
    try {
      await addMakeMaterial(
        makeId,
        Number(materialId),
        quantityUsed ? Number(quantityUsed) : undefined
      );
      toast.success("Material added");
      onAdded();
    } catch {
      toast.error("Failed to add material");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal">
        <div className="inv-modal__header">
          <span className="inv-modal__title">Add Material</span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal__body">
          {available.length === 0 ? (
            <div className="inv-empty">All your materials are already linked to this make.</div>
          ) : (
            <>
              <div className="inv-field">
                <label>Material</label>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(Number(e.target.value))}
                >
                  {available.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.unit_type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="inv-field">
                <label>Quantity Used (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantityUsed}
                  onChange={(e) => setQuantityUsed(e.target.value)}
                  placeholder="Leave blank if unknown"
                />
                {selectedMaterial && (
                  <span className="inv-field__hint">
                    Unit: {selectedMaterial.unit_type} — In stock: {selectedMaterial.quantity}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="inv-modal__footer">
          <button type="button" className="inv-btn" onClick={onClose}>Cancel</button>
          {available.length > 0 && (
            <button
              type="button"
              className="inv-btn inv-btn--primary"
              onClick={handleAdd}
              disabled={saving}
            >
              {saving ? "Adding..." : "Add Material"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}