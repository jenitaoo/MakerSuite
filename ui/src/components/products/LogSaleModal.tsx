import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getCookie } from "../../services/api";
import { getTags, createTag } from "../../services/inventoryApi";
import { Product } from "../../types/product";
import { SaleTag } from "../../types/inventory";

type Props = {
  product: Product;
  onClose: () => void;
  onLogged: () => void;
};

export default function LogSaleModal({ product, onClose, onLogged }: Props) {
  const [unitsSold, setUnitsSold] = useState(1);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<SaleTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);
  const [unitPrices, setUnitPrices] = useState<string[]>([product.internal_price ?? ""]);

  const defaultPrice = product.internal_price ?? "";
  const inStock = product.internal_quantity ?? 0;

  useEffect(() => {
    getTags().then((data) => setTags(data.results ?? data)).catch(() => {});
  }, []);

  const handleUnitsSoldChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, inStock));
    setUnitsSold(clamped);
    setUnitPrices((prev) =>
      Array(clamped).fill("").map((_, i) => prev[i] ?? defaultPrice)
    );
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
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (unitsSold > inStock) {
      toast.error(`Only ${inStock} in stock`);
      return;
    }
    setSaving(true);
    try {
      const unit_prices = unitPrices.map((p, i) => ({
        unit: i + 1,
        price: p || defaultPrice || "0",
      }));

      const res = await fetch(`/api/products/${product.id}/log-sale/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: JSON.stringify({
          units_sold: unitsSold,
          sale_date: saleDate,
          tag_ids: selectedTagIds,
          source: "manual",
          unit_prices,
          sale_price: totalSaleValue.toFixed(2),
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to log sale");
        return;
      }

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
          <DialogTitle>Log Sale — {product.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Units Sold</Label>
            <Input
              type="number" min={1} max={inStock}
              value={unitsSold}
              onChange={(e) => handleUnitsSoldChange(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
            />
            <p className="text-xs text-muted-foreground">{inStock} in stock</p>
          </div>

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
                    type="number" step="0.01" min="0"
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
            <Label>Tags</Label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id} type="button"
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
                value={newTagName} onChange={(e) => setNewTagName(e.target.value)}
                placeholder="New tag name..."
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>+ Add</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click a tag to select it. Press Enter or + Add to create a new one.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Logging..." : "Log Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}