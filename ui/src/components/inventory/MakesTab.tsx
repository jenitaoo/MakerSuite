import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMakes, createMake, deleteMake } from "../../services/inventoryApi";
import { Make } from "../../types/inventory";
import CreateMakeModal from "./CreateMakeModal";
import LogMakeSaleModal from "./LogMakeSaleModal";

export default function MakesTab() {
  const navigate = useNavigate();
  const [makes, setMakes] = useState<Make[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logTarget, setLogTarget] = useState<Make | null>(null);

  const fetchMakes = async () => {
    try {
      const data = await getMakes();
      setMakes(data.results ?? data);
    } catch (err) {
      toast.error("Failed to load makes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMakes();
  }, []);

  const handleDelete = async (make: Make) => {
    const confirmed = window.confirm(
      `Delete "${make.name}"? This will also delete all linked sales and inventory logs.`
    );
    if (!confirmed) return;
    try {
      await deleteMake(make.id);
      toast.success("Make deleted");
      fetchMakes();
    } catch {
      toast.error("Failed to delete make");
    }
  };

  const availableBadge = (available: number) =>
    available > 0 ? (
      <span className="inv-badge inv-badge--success">{available}</span>
    ) : (
      <span className="inv-badge inv-badge--neutral">0</span>
    );

  if (loading) return <div className="inv-empty">Loading makes...</div>;

  return (
    <div>
      <div className="inv-toolbar">
        <div className="inv-toolbar__left">
          <span style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
            {makes.length} {makes.length === 1 ? "make" : "makes"}
          </span>
        </div>
        <button
          type="button"
          className="inv-btn inv-btn--primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Log a Make
        </button>
      </div>

      {makes.length === 0 ? (
        <div className="inv-empty">
          No makes yet! Click "Log a Make" to get started.
        </div>
      ) : (
        <div className="inv-table-wrapper">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Date Made</th>
                <th>Units Produced</th>
                <th>Available</th>
                <th>Sold</th>
                <th>Linked Product</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {makes.map((make) => (
                <tr key={make.id}>
                  <td>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-text-primary)",
                        fontWeight: 500,
                        padding: 0,
                        textAlign: "left",
                      }}
                      onClick={() => navigate(`/inventory/makes/${make.id}`)}
                    >
                      {make.name}
                    </button>
                  </td>
                  <td>{make.date_made ?? "—"}</td>
                  <td>{make.units_produced}</td>
                  <td>{availableBadge(make.available_units)}</td>
                  <td>{make.units_sold}</td>
                  <td>
                    {make.product ? (
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => navigate(`/products/${make.product}/edit`)}
                      >
                        {make.product_title ?? `Product #${make.product}`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => navigate("/products/new")}
                      >
                        + Create Product
                      </button>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => navigate(`/inventory/makes/${make.id}`)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => setLogTarget(make)}
                      >
                        Log Sale
                      </button>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm inv-btn--danger"
                        onClick={() => handleDelete(make)}
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
        <CreateMakeModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchMakes();
          }}
        />
      )}

      {logTarget && (
        <LogMakeSaleModal
          make={logTarget}
          onClose={() => setLogTarget(null)}
          onLogged={() => {
            setLogTarget(null);
            fetchMakes();
          }}
        />
      )}
    </div>
  );
}