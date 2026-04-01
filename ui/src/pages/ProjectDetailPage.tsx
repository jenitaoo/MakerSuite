import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getProject,
  logMake,
  getMakeLogs,
  getProjectSales,
  getProjectMaterials,
  addProjectMaterial,
  removeProjectMaterial,
  getMaterials,
} from "../services/inventoryApi";
import { Project, SaleLog, MakeLog, ProjectMaterial, RawMaterial } from "../types/inventory";
import LogMakeSaleModal from "../components/inventory/LogMakeSaleModal";
import "../styles/inventory.css";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [sales, setSales] = useState<SaleLog[]>([]);
  const [makeLogs, setMakeLogs] = useState<MakeLog[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [allMaterials, setAllMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogSale, setShowLogSale] = useState(false);
  const [showLogMake, setShowLogMake] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  // sale filters
  const [filterTagIds, setFilterTagIds] = useState<number[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchAll = async () => {
    if (!id) return;
    try {
      const [projectData, salesData, makeLogsData, materialsData, allMatsData] =
        await Promise.all([
          getProject(Number(id)),
          getProjectSales(Number(id)),
          getMakeLogs(Number(id)),
          getProjectMaterials(Number(id)),
          getMaterials(),
        ]);
      setProject(projectData);
      setSales(salesData.results ?? salesData);
      setMakeLogs(makeLogsData.results ?? makeLogsData);
      setMaterials(materialsData.results ?? materialsData);
      setAllMaterials(allMatsData.results ?? allMatsData);
    } catch {
      toast.error("Failed to load project");
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
      const data = await getProjectSales(Number(id), {
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
    if (project) fetchSales();
  }, [filterTagIds, filterDateFrom, filterDateTo]);

  const handleRemoveMaterial = async (materialId: number) => {
    if (!id) return;
    const confirmed = window.confirm("Remove this material from the project?");
    if (!confirmed) return;
    try {
      await removeProjectMaterial(Number(id), materialId);
      toast.success("Material removed");
      fetchAll();
    } catch {
      toast.error("Failed to remove material");
    }
  };

  if (loading) return <div className="inv-empty">Loading...</div>;
  if (!project) return <div className="inv-empty">Project not found.</div>;

  const allTags = Array.from(
    new Map(
      sales.flatMap((s) => s.tags).map((t) => [t.id, t])
    ).values()
  );

  const totalSold = sales.reduce((sum, s) => sum + s.units_sold, 0);
  const totalMade = makeLogs.reduce((sum, m) => sum + m.units_made, 0);

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
        <h1 style={{ fontSize: "1.5rem", fontWeight: 400, margin: 0, fontFamily: "var(--font-heading)", color: "var(--color-primary)" }}>
          {project.name}
        </h1>
      </div>

      {/* summary cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        {[
          { label: "Units Made", value: totalMade },
          { label: "In Stock", value: project.in_stock },
          { label: "Sold", value: totalSold },
          {
            label: "Linked Product",
            value: project.product_title ?? "None",
            link: project.product ? `/products/${project.product}/edit` : null,
          },
          {
            label: "Last Updated",
            value: new Date(project.updated_at).toLocaleDateString(),
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              background: "#f8f9fb",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#596780", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.3px" }}>
              {card.label}
            </div>
            {card.link ? (
              <button
                type="button"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#000000",
                  fontWeight: 500,
                  fontSize: "1rem",
                  padding: 0,
                  fontFamily: "var(--font-body)",
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
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="inv-btn inv-btn--primary"
          onClick={() => setShowLogMake(true)}
        >
          Log a Make
        </button>
        <button
          type="button"
          className="inv-btn"
          onClick={() => setShowLogSale(true)}
          disabled={project.in_stock === 0}
        >
          Log Sale
        </button>
      </div>

      {project.notes && (
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: "4px",
          background: "#f8f9fb",
          border: "1px solid #e0e0e0",
          fontSize: "0.875rem",
          color: "#596780",
          marginBottom: "1.5rem",
        }}>
          {project.notes}
        </div>
      )}

      {/* materials section */}
      <section style={{ marginBottom: "2rem" }}>
        <div className="inv-toolbar">
          <h2 style={{ fontSize: "0.875rem", fontWeight: 500, margin: 0, textTransform: "uppercase", color: "#596780", letterSpacing: "0.3px" }}>
            Materials
          </h2>
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
                  <th>Quantity Used Per Make</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((pm) => (
                  <tr key={pm.id}>
                    <td>{pm.material_name}</td>
                    <td>{pm.material_unit_type}</td>
                    <td>
                      {pm.quantity_used !== null
                        ? `${pm.quantity_used} ${pm.material_unit_type}`
                        : <span style={{ color: "#aaaaaa" }}>not set</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm inv-btn--danger"
                        onClick={() => handleRemoveMaterial(pm.material)}
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

      {/* make history section */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 500, margin: "0 0 1rem 0", textTransform: "uppercase", color: "#596780", letterSpacing: "0.3px" }}>
          Make History
          <span style={{ marginLeft: "0.5rem", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            {totalMade} units made total
          </span>
        </h2>

        {makeLogs.length === 0 ? (
          <div className="inv-empty" style={{ padding: "1.5rem" }}>
            No makes logged yet — click "Log a Make" to record a production run.
          </div>
        ) : (
          <div className="inv-table-wrapper">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Units Made</th>
                  <th>Materials Deducted</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {makeLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.date_made ?? <span style={{ color: "#aaaaaa" }}>—</span>}</td>
                    <td>{log.units_made}</td>
                    <td>
                      {log.deducted_materials ? (
                        <span className="inv-badge inv-badge--success">Yes</span>
                      ) : (
                        <span className="inv-badge inv-badge--neutral">No</span>
                      )}
                    </td>
                    <td>{log.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* sales history section */}
      <section>
        <h2 style={{ fontSize: "0.875rem", fontWeight: 500, margin: "0 0 0.75rem 0", textTransform: "uppercase", color: "#596780", letterSpacing: "0.3px" }}>
          Sales History
          <span style={{ marginLeft: "0.5rem", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            {totalSold} sold total
          </span>
        </h2>

        {/* filters */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
          {allTags.length > 0 && (
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "#596780" }}>Tag:</span>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="inv-tag"
                  style={
                    filterTagIds.includes(tag.id)
                      ? { background: "#818263", color: "#ffffff" }
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
            <span style={{ fontSize: "0.8rem", color: "#596780" }}>From:</span>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{ fontSize: "0.8rem", padding: "2px 6px", border: "1px solid #e0e0e0", borderRadius: "4px", background: "#ffffff", color: "#000000" }}
            />
            <span style={{ fontSize: "0.8rem", color: "#596780" }}>To:</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{ fontSize: "0.8rem", padding: "2px 6px", border: "1px solid #e0e0e0", borderRadius: "4px", background: "#ffffff", color: "#000000" }}
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
          project={project}
          onClose={() => setShowLogSale(false)}
          onLogged={() => { setShowLogSale(false); fetchAll(); }}
        />
      )}

      {showLogMake && (
        <LogMakeModal
          project={project}
          onClose={() => setShowLogMake(false)}
          onLogged={() => { setShowLogMake(false); fetchAll(); }}
        />
      )}

      {showAddMaterial && (
        <AddMaterialModal
          projectId={project.id}
          allMaterials={allMaterials}
          existingMaterialIds={materials.map((m) => m.material)}
          onClose={() => setShowAddMaterial(false)}
          onAdded={() => { setShowAddMaterial(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

// ── Log Make Modal ───────────────────────────────────────────

type LogMakeProps = {
  project: Project;
  onClose: () => void;
  onLogged: () => void;
};

function LogMakeModal({ project, onClose, onLogged }: LogMakeProps) {
  const [unitsMade, setUnitsMade] = useState(1);
  const [dateMade, setDateMade] = useState(new Date().toISOString().split("T")[0]);
  const [deductMaterials, setDeductMaterials] = useState(false);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const hasMaterialQuantities = project.project_materials.some(
    (m) => m.quantity_used !== null
  );

  const handleLog = async () => {
    setSaving(true);
    try {
      await logMake(project.id, {
        units_made: unitsMade,
        date_made: dateMade || undefined,
        deduct_materials: deductMaterials,
        notes: notes || undefined,
      });
      toast.success("Make logged");
      onLogged();
    } catch {
      toast.error("Failed to log make");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal">
        <div className="inv-modal__header">
          <span className="inv-modal__title">Log a Make — {project.name}</span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal__body">
          <div className="inv-field">
            <label>Units Made</label>
            <input
              type="number"
              min="1"
              value={unitsMade}
              onChange={(e) => setUnitsMade(Number(e.target.value))}
            />
            <span className="inv-field__hint">
              How many did you make in this run? This will be added to the total and the linked product's quantity.
            </span>
          </div>
          <div className="inv-field">
            <label>Date Made</label>
            <input
              type="date"
              value={dateMade}
              onChange={(e) => setDateMade(e.target.value)}
            />
          </div>
          {hasMaterialQuantities && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.875rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={deductMaterials}
                onChange={(e) => setDeductMaterials(e.target.checked)}
                style={{ marginTop: "2px" }}
              />
              <span>
                Deduct materials from stock
                <span style={{ display: "block", fontSize: "0.75rem", color: "#596780", marginTop: "2px" }}>
                  Only materials with quantities set will be deducted.
                </span>
              </span>
            </label>
          )}
          <div className="inv-field">
            <label>Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Used different yarn colour for this batch"
            />
          </div>
        </div>
        <div className="inv-modal__footer">
          <button type="button" className="inv-btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="inv-btn inv-btn--primary"
            onClick={handleLog}
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
  projectId: number;
  allMaterials: RawMaterial[];
  existingMaterialIds: number[];
  onClose: () => void;
  onAdded: () => void;
};

function AddMaterialModal({
  projectId,
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
      await addProjectMaterial(
        projectId,
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
            <div className="inv-empty">
              {allMaterials.length === 0
                ? "You haven't added any raw materials yet! Go to the \"Raw Materials\" tab to add some first (๑•̀ㅂ•́)و✧."
                : "All your raw materials are already linked to this project."}
            </div>
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
                <label>Quantity Used Per Make (optional)</label>
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
                    Unit: {selectedMaterial.unit_type} — In stock: {selectedMaterial.quantity} {selectedMaterial.unit_type}
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