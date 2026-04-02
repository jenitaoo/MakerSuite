import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { logSale, getTags, createTag } from "../../services/inventoryApi";
import { Project, SaleTag } from "../../types/inventory";

type Props = {
  project: Project;
  onClose: () => void;
  onLogged: () => void;
};

export default function LogMakeSaleModal({ project, onClose, onLogged }: Props) {
  const [unitsSold, setUnitsSold] = useState(1);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [source, setSource] = useState<"manual" | "etsy">("manual");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<SaleTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTags()
      .then((data) => setTags(data.results ?? data))
      .catch(() => {});
  }, []);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tag = await createTag(newTagName.trim());
      setTags((prev) => [...prev, tag]);
      setSelectedTagIds((prev) => [...prev, tag.id]);
      setNewTagName("");
    } catch {
      toast.error("Failed to create tag");
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (unitsSold > project.in_stock) {
      toast.error(`Only ${project.in_stock} in stock`);
      return;
    }
    setSaving(true);
    try {
      await logSale(project.id, {
        units_sold: unitsSold,
        sale_date: saleDate,
        tag_ids: selectedTagIds,
        source,
        notes: notes || undefined,
      });
      toast.success("Sale logged");
      onLogged();
    } catch {
      toast.error("Failed to log sale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inv-modal-overlay">
      <div className="inv-modal">
        <div className="inv-modal__header">
          <span className="inv-modal__title">Log Sale — {project.name}</span>
          <button type="button" className="inv-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="inv-modal__body">
          <div className="inv-field">
            <label>Units Sold</label>
            <input
              type="number"
              min={1}
              max={project.in_stock}
              value={unitsSold}
              onChange={(e) => setUnitsSold(Number(e.target.value))}
            />
            <span className="inv-field__hint">{project.in_stock} in stock</span>
          </div>
          <div className="inv-field">
            <label>Date</label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>
          <div className="inv-field">
            <label>Source</label>
            <div className="inv-toggle">
              <button
                type="button"
                className={`inv-toggle__option ${source === "manual" ? "inv-toggle__option--active" : ""}`}
                onClick={() => setSource("manual")}
              >
                Manual
              </button>
              <button
                type="button"
                className={`inv-toggle__option ${source === "etsy" ? "inv-toggle__option--active" : ""}`}
                onClick={() => setSource("etsy")}
              >
                Etsy
              </button>
            </div>
          </div>
          <div className="inv-field">
            <label>Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="inv-tag"
                  style={
                    selectedTagIds.includes(tag.id)
                      ? { background: "#818263", color: "#ffffff" }
                      : {}
                  }
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="inv-btn inv-btn--sm"
                onClick={handleAddTag}
              >
                + Add
              </button>
            </div>
            <span className="inv-field__hint">
              Click a tag to select it. Press Enter or + Add to create a new one.
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
            {saving ? "Saving..." : "Log Sale"}
          </button>
        </div>
      </div>
    </div>
  );
}