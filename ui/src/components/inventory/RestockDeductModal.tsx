import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { restockMaterial, deductMaterial } from "../../services/inventoryApi";
import { RawMaterial } from "../../types/inventory";

type Props = {
  material: RawMaterial;
  onClose: () => void;
  onSaved: () => void;
};

export default function RestockDeductModal({ material, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<"restock" | "deduct">("restock");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) { toast.error("Enter a valid quantity"); return; }
    setSaving(true);
    try {
      if (mode === "restock") {
        await restockMaterial(material.id, qty, notes || undefined);
        toast.success(`Restocked ${qty} ${material.unit_type}`);
      } else {
        await deductMaterial(material.id, qty, notes || undefined);
        toast.success(`Deducted ${qty} ${material.unit_type}`);
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Restock / Use — {material.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Current stock: <span className="font-medium text-foreground">{material.quantity} {material.unit_type}</span>
          </p>

          {/* Mode toggle */}
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setMode("restock")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "restock" ? "bg-[hsl(var(--primary))] text-white" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Restock
            </button>
            <button
              type="button"
              onClick={() => setMode("deduct")}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === "deduct" ? "bg-[hsl(var(--primary))] text-white" : "bg-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Use / Deduct
            </button>
          </div>

          <div className="space-y-2">
            <Label>Quantity ({material.unit_type})</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Bought from Amazon" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : mode === "restock" ? "Restock" : "Deduct"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}