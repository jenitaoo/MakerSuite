import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { createMake } from "../../services/inventoryApi";
import { getCookie } from "../../services/api";

type Product = { id: number; title: string };

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateMakeModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [productId, setProductId] = useState<number | "">("");
  const [dateMade, setDateMade] = useState("");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/product-list/?page_size=100", {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-CSRFToken": getCookie("csrftoken") ?? "",
      },
    })
      .then((r) => r.json())
      .then((data) => setProducts(data.results ?? data))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await createMake({
        name,
        product: productId || null,
        date_made: dateMade || null,
        notes: notes || null,
      });
      toast.success("Make created");
      onCreated();
    } catch {
      toast.error("Failed to create make");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal">
        <div className="inv-modal__header">
          <span className="inv-modal__title">Log a Make</span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="inv-modal__body">
          <div className="inv-field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Light Tea Rose Rings — Batch 3"
            />
          </div>

          <div className="inv-field">
            <label>Link to Product (optional)</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— None —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          <div className="inv-field">
            <label>Date Made (optional)</label>
            <input
              type="date"
              value={dateMade}
              onChange={(e) => setDateMade(e.target.value)}
            />
          </div>

          <div className="inv-field">
            <label>Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this make..."
            />
          </div>
        </div>

        <div className="inv-modal__footer">
          <button type="button" className="inv-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="inv-btn inv-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Create Make"}
          </button>
        </div>
      </div>
    </div>
  );
}