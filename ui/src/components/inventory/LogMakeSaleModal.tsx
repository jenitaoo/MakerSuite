import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { logSale, getTags, createTag } from "../../services/inventoryApi";
import { Project, SaleTag } from "../../types/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Log Sale — {project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Units Sold</Label>
            <Input
              type="number"
              min={1}
              max={project.in_stock}
              value={unitsSold}
              onChange={(e) => setUnitsSold(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
            />
            <p className="text-xs text-muted-foreground">{project.in_stock} in stock</p>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>

          {/* Source toggle */}
          <div className="space-y-2">
            <Label>Source</Label>
            <div className="flex rounded-md border border-border overflow-hidden">
              {(["manual", "etsy"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSource(opt)}
                  className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                    source === opt
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "bg-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt === "etsy" ? "Etsy" : "Manual"}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? "bg-[hsl(var(--primary))] text-white border-transparent"
                        : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
                + Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click a tag to select it. Press Enter or + Add to create a new one.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Log Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}