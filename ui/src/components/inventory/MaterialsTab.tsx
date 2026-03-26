import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  restockMaterial,
  deductMaterial,
  getMaterialLogs,
} from "../../services/inventoryApi";
import { RawMaterial, InventoryLog } from "../../types/inventory";

export default function MaterialsTab() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<RawMaterial | null>(null);
  const [logTarget, setLogTarget] = useState<RawMaterial | null>(null);
  const [historyTarget, setHistoryTarget] = useState<RawMaterial | null>(null);
  const [detailTarget, setDetailTarget] = useState<RawMaterial | null>(null);

  const fetchMaterials = async () => {
    try {
      const data = await getMaterials();
      setMaterials(data.results ?? data);
    } catch {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleDelete = async (material: RawMaterial) => {
    const confirmed = window.confirm(`Delete "${material.name}"?`);
    if (!confirmed) return;
    try {
      await deleteMaterial(material.id);
      toast.success("Material deleted");
      fetchMaterials();
    } catch (err: any) {
      const msg = err.message?.includes("linked")
        ? "Remove this material from all makes before deleting."
        : "Failed to delete material";
      toast.error(msg);
    }
  };

  if (loading) return <div className="inv-empty">Loading materials...</div>;

  return (
    <div>
      <div className="inv-toolbar">
        <div className="inv-toolbar__left">
          <span style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
            {materials.length} {materials.length === 1 ? "material" : "materials"}
          </span>
          {materials.some((m) => m.is_low_stock) && (
            <span className="inv-badge inv-badge--warning">
              ⚠ {materials.filter((m) => m.is_low_stock).length} low stock
            </span>
          )}
        </div>
        <button
          type="button"
          className="inv-btn inv-btn--primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Add Material
        </button>
      </div>

      {materials.length === 0 ? (
        <div className="inv-empty">
          No materials yet — click "Add Material" to get started.
        </div>
      ) : (
        <div className="inv-table-wrapper">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit Type</th>
                <th>In Stock</th>
                <th>Low Stock</th>
                <th>Brand</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.id}>
                  <td style={{ fontWeight: 500 }}>{material.name}</td>
                  <td>{material.unit_type}</td>
                  <td>{material.quantity}</td>
                  <td>
                    {material.is_low_stock ? (
                      <span className="inv-badge inv-badge--warning">Low</span>
                    ) : (
                      <span className="inv-badge inv-badge--success">OK</span>
                    )}
                  </td>
                  <td>{material.brand ?? "—"}</td>
                  <td>{material.source ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => setLogTarget(material)}
                      >
                        Restock / Use
                      </button>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => setHistoryTarget(material)}
                      >
                        History
                      </button>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => setDetailTarget(material)}
                      >
                        More Details
                      </button>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => setEditTarget(material)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm inv-btn--danger"
                        onClick={() => handleDelete(material)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <MaterialFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); fetchMaterials(); }}
        />
      )}

      {editTarget && (
        <MaterialFormModal
          material={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchMaterials(); }}
        />
      )}

      {logTarget && (
        <RestockDeductModal
          material={logTarget}
          onClose={() => setLogTarget(null)}
          onSaved={() => { setLogTarget(null); fetchMaterials(); }}
        />
      )}

      {historyTarget && (
        <MaterialHistoryModal
          material={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {detailTarget && (
        <MaterialDetailModal
          material={detailTarget}
          onClose={() => setDetailTarget(null)}
          onSaved={(updated) => {
            setDetailTarget(null);
            fetchMaterials();
          }}
        />
      )}
    </div>
  );
}

// ── Material Form Modal (create + edit) ──────────────────────

type MaterialFormProps = {
  material?: RawMaterial;
  onClose: () => void;
  onSaved: () => void;
};

function MaterialFormModal({ material, onClose, onSaved }: MaterialFormProps) {
  const [name, setName] = useState(material?.name ?? "");
  const [unit_type, setUnit] = useState(material?.unit_type ?? "");
  const [quantity, setQuantity] = useState(material?.quantity ?? "0");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    material?.low_stock_threshold ?? "10"
  );
  const [notes, setNotes] = useState(material?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!unit_type.trim()) { toast.error("Unit is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name,
        unit_type,
        quantity: Number(quantity),
        low_stock_threshold: lowStockThreshold ? Number(lowStockThreshold) : null,
        notes: notes || null,
      };
      if (material) {
        await updateMaterial(material.id, payload);
        toast.success("Material updated");
      } else {
        await createMaterial(payload);
        toast.success("Material created");
      }
      onSaved();
    } catch {
      toast.error("Failed to save material");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal">
        <div className="inv-modal__header">
          <span className="inv-modal__title">
            {material ? "Edit Material" : "Add Material"}
          </span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal__body">
          <div className="inv-field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Miyuki Seed Beads (Light Tea Rose)"
            />
          </div>
          <div className="inv-field">
            <label>Unit</label>
            <input
              value={unit_type}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. grams, pieces, metres"
            />
          </div>
          <div className="inv-field">
            <label>Current Stock</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="inv-field">
            <label>Low Stock Threshold (optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={lowStockThreshold ?? ""}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
            <span className="inv-field__hint">
              A warning will show when stock drops to or below this amount.
            </span>
          </div>
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
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : material ? "Save Changes" : "Add Material"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Restock / Deduct Modal ───────────────────────────────────

type RestockDeductProps = {
  material: RawMaterial;
  onClose: () => void;
  onSaved: () => void;
};

function RestockDeductModal({ material, onClose, onSaved }: RestockDeductProps) {
  const [type, setType] = useState<"restock" | "deduct">("restock");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!quantity || Number(quantity) <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setSaving(true);
    try {
      if (type === "restock") {
        await restockMaterial(material.id, Number(quantity), notes || undefined);
        toast.success("Stock restocked");
      } else {
        await deductMaterial(material.id, Number(quantity), notes || undefined);
        toast.success("Stock deducted");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal">
        <div className="inv-modal__header">
          <span className="inv-modal__title">{material.name}</span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal__body">
          <div className="inv-field">
            <label>Type</label>
            <div className="inv-toggle">
              <button
                type="button"
                className={`inv-toggle__option ${type === "restock" ? "inv-toggle__option--active" : ""}`}
                onClick={() => setType("restock")}
              >
                Restock
              </button>
              <button
                type="button"
                className={`inv-toggle__option ${type === "deduct" ? "inv-toggle__option--active" : ""}`}
                onClick={() => setType("deduct")}
              >
                Use / Deduct
              </button>
            </div>
          </div>
          <div className="inv-field">
            <label>Quantity ({material.unit_type})</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
            <span className="inv-field__hint">
              Current stock: {material.quantity} {material.unit_type}
            </span>
          </div>
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
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : type === "restock" ? "Restock" : "Deduct"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Material History Modal ───────────────────────────────────

type HistoryProps = {
  material: RawMaterial;
  onClose: () => void;
};

function MaterialHistoryModal({ material, onClose }: HistoryProps) {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaterialLogs(material.id)
      .then((data) => setLogs(data.results ?? data))
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  const changeLabel = (type: InventoryLog["change_type"]) => {
    const map: Record<string, string> = {
      restock: "Restock",
      make_completion: "Make",
      manual_add: "Manual Add",
      manual_deduct: "Manual Deduct",
      sale: "Sale",
    };
    return map[type] ?? type;
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal" style={{ maxWidth: 560 }}>
        <div className="inv-modal__header">
          <span className="inv-modal__title">History — {material.name}</span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal__body">
          {loading ? (
            <div className="inv-empty">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="inv-empty">No history yet.</div>
          ) : (
            <div className="inv-table-wrapper">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Change</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleDateString()}</td>
                      <td>{changeLabel(log.change_type)}</td>
                      <td style={{
                        color: Number(log.quantity_change) >= 0
                          ? "var(--color-text-success)"
                          : "var(--color-text-danger)",
                        fontWeight: 500,
                      }}>
                        {Number(log.quantity_change) >= 0 ? "+" : ""}
                        {log.quantity_change} {material.unit_type}
                      </td>
                      <td>{log.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="inv-modal__footer">
          <button type="button" className="inv-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── More Details Modal ───────────────────────────────────────

type DetailProps = {
  material: RawMaterial;
  onClose: () => void;
  onSaved: (updated: RawMaterial) => void;
};

function MaterialDetailModal({ material, onClose, onSaved }: DetailProps) {
  const [sku, setSku] = useState(material.sku ?? "");
  const [brand, setBrand] = useState(material.brand ?? "");
  const [source, setSource] = useState(material.source ?? "");
  const [supplier, setSupplier] = useState(material.supplier ?? "");
  const [costPerUnit, setCostPerUnit] = useState(material.cost_per_unit ?? "");
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>(
    Object.entries(material.custom_fields ?? {}).map(([key, value]) => ({ key, value }))
  );
  const [saving, setSaving] = useState(false);

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  };

  const updateCustomField = (index: number, field: "key" | "value", val: string) => {
    setCustomFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: val } : f))
    );
  };

  const removeCustomField = (index: number) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const custom: Record<string, string> = {};
      customFields.forEach(({ key, value }) => {
        if (key.trim()) custom[key.trim()] = value;
      });
      const updated = await updateMaterial(material.id, {
        sku: sku || null,
        brand: brand || null,
        source: source || null,
        supplier: supplier || null,
        cost_per_unit: costPerUnit ? Number(costPerUnit) : null,
        custom_fields: custom,
      });
      toast.success("Details saved");
      onSaved(updated);
    } catch {
      toast.error("Failed to save details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal" style={{ maxWidth: 520 }}>
        <div className="inv-modal__header">
          <span className="inv-modal__title">More Details — {material.name}</span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal__body">
          <div className="inv-field">
            <label>SKU</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. MYK-LTR-2MM" />
          </div>
          <div className="inv-field">
            <label>Brand</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Miyuki" />
          </div>
          <div className="inv-field">
            <label>Source</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Hobbycraft" />
          </div>
          <div className="inv-field">
            <label>Supplier</label>
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. https://hobbycraft.co.uk/..." />
          </div>
          <div className="inv-field">
            <label>Cost Per Unit (optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="inv-field">
            <label>Custom Fields</label>
            {customFields.map((field, i) => (
              <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <input
                  value={field.key}
                  onChange={(e) => updateCustomField(i, "key", e.target.value)}
                  placeholder="Field name"
                  style={{ flex: 1 }}
                />
                <input
                  value={field.value}
                  onChange={(e) => updateCustomField(i, "value", e.target.value)}
                  placeholder="Value"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="inv-btn inv-btn--sm inv-btn--danger"
                  onClick={() => removeCustomField(i)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="inv-btn inv-btn--sm"
              onClick={addCustomField}
              style={{ marginTop: "0.25rem" }}
            >
              + Add Field
            </button>
          </div>
        </div>
        <div className="inv-modal__footer">
          <button type="button" className="inv-btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="inv-btn inv-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </div>
    </div>
  );
}