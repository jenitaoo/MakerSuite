import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { logMake, logSale, getTags, createTag } from "../../services/inventoryApi";
import { Project, SaleTag } from "../../types/inventory";

type Props = {
  project: Project;
  onClose: () => void;
  onLogged: () => void;
};

export default function ProjectLogActionModal({ project, onClose, onLogged }: Props) {
  const [mode, setMode] = useState<"make" | "sale">("make");

  // make fields
  const [unitsMade, setUnitsMade] = useState(1);
  const [dateMade, setDateMade] = useState(new Date().toISOString().split("T")[0]);
  const [deductMaterials, setDeductMaterials] = useState(false);
  const [makeNotes, setMakeNotes] = useState("");

  // sale fields
  const [unitsSold, setUnitsSold] = useState(1);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [saleNotes, setSaleNotes] = useState("");
  const [tags, setTags] = useState<SaleTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  // per-unit prices — array length matches unitsSold
  const [unitPrices, setUnitPrices] = useState<string[]>([project.product_price ?? ""]);

  const [saving, setSaving] = useState(false);

  const hasMaterialQuantities = project.project_materials?.some((m) => m.quantity_used !== null);
  const defaultPrice = project.product_price ?? "";

  useEffect(() => {
    getTags().then((data) => setTags(data.results ?? data)).catch(() => {});
  }, []);

  // When unitsSold changes, resize the unitPrices array
  // keeping existing overrides and filling new rows with the default price
  const handleUnitsSoldChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, project.in_stock));
    setUnitsSold(clamped);
    setUnitPrices((prev) => {
      const next = Array(clamped).fill("").map((_, i) => prev[i] ?? defaultPrice);
      return next;
    });
  };

  const handleUnitPriceChange = (index: number, value: string) => {
    setUnitPrices((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const totalSaleValue = unitPrices.reduce((sum, p) => {
    const parsed = parseFloat(p);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

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
    setSelectedTagIds((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (mode === "make") {
        if (unitsMade < 1) { toast.error("Units made must be at least 1"); return; }
        await logMake(project.id, {
          units_made: unitsMade,
          date_made: dateMade || undefined,
          deduct_materials: deductMaterials,
          notes: makeNotes || undefined,
        });
        toast.success("Make logged");
      } else {
        if (unitsSold > project.in_stock) { toast.error(`Only ${project.in_stock} in stock`); return; }

        const unit_prices = unitPrices.map((p, i) => ({
          unit: i + 1,
          price: p || defaultPrice || "0",
        }));

        await logSale(project.id, {
          units_sold: unitsSold,
          sale_date: saleDate,
          tag_ids: selectedTagIds,
          source: "manual",
          unit_prices,
          sale_price: totalSaleValue.toFixed(2),
          notes: saleNotes || undefined,
        });
        toast.success("Sale logged");
      }
      onLogged();
    } catch {
      toast.error(`Failed to log ${mode}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Log Action — {project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["make", "sale"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setMode(opt)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  mode === opt
                    ? "bg-[hsl(var(--primary))] text-white"
                    : "bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt === "make" ? "Log Make" : "Log Sale"}
              </button>
            ))}
          </div>

          {mode === "make" ? (
            <>
              <div className="space-y-2">
                <Label>Units Made</Label>
                <Input
                  type="number"
                  min={1}
                  value={unitsMade}
                  onChange={(e) => setUnitsMade(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                />
                <p className="text-xs text-muted-foreground">Adds to the total and linked product's quantity.</p>
              </div>
              <div className="space-y-2">
                <Label>Date Made</Label>
                <Input type="date" value={dateMade} onChange={(e) => setDateMade(e.target.value)} />
              </div>
              {hasMaterialQuantities && (
                <div className="flex items-start gap-2">
                  <Checkbox checked={deductMaterials} onCheckedChange={(v) => setDeductMaterials(!!v)} className="mt-0.5" />
                  <div>
                    <Label className="cursor-pointer">Deduct materials from stock</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Only materials with quantities set will be deducted.</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea rows={2} value={makeNotes} onChange={(e) => setMakeNotes(e.target.value)} placeholder="e.g. Used different colour for this batch" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Units Sold</Label>
                <Input
                  type="number"
                  min={1}
                  max={project.in_stock}
                  value={unitsSold}
                  onChange={(e) => handleUnitsSoldChange(Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                />
                <p className="text-xs text-muted-foreground">{project.in_stock} in stock</p>
              </div>

              {/* Per-unit prices */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Price per Unit (€)</Label>
                  {defaultPrice && (
                    <span className="text-xs text-muted-foreground">Default: €{defaultPrice}</span>
                  )}
                </div>
                <div className="space-y-2">
                  {unitPrices.map((price, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12 shrink-0">Unit {i + 1}</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={defaultPrice || "0.00"}
                        value={price}
                        onChange={(e) => handleUnitPriceChange(i, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-sm font-medium">€{totalSaleValue.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
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
                  <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>+ Add</Button>
                </div>
                <p className="text-xs text-muted-foreground">Click a tag to select it. Press Enter or + Add to create a new one.</p>
              </div>

              <div className="space-y-2">
                <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea rows={2} value={saleNotes} onChange={(e) => setSaleNotes(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : mode === "make" ? "Log Make" : "Log Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}