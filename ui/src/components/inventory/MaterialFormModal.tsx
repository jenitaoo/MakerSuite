import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createMaterial, updateMaterial } from "../../services/inventoryApi";
import { RawMaterial } from "../../types/inventory";

type Props = {
  material?: RawMaterial;
  onClose: () => void;
  onSaved: () => void;
};

export default function MaterialFormModal({ material, onClose, onSaved }: Props) {
  const isEdit = !!material;
  const [form, setForm] = useState({
    name: material?.name ?? "",
    unit_type: material?.unit_type ?? "",
    quantity: material?.quantity ?? 0,
    low_stock_threshold: material?.low_stock_threshold ?? 10,
    cost_per_unit: material?.cost_per_unit ?? "",
    brand: material?.brand ?? "",
    source: material?.source ?? "",
    supplier: material?.supplier ?? "",
    sku: material?.sku ?? "",
    notes: material?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.unit_type.trim()) { toast.error("Unit type is required"); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateMaterial(material.id, form);
        toast.success("Material updated");
      } else {
        await createMaterial(form);
        toast.success("Material created");
      }
      onSaved();
    } catch {
      toast.error(isEdit ? "Failed to update material" : "Failed to create material");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Material" : "Add Material"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Seed Beads" />
            </div>
            <div className="space-y-2">
              <Label>Unit Type *</Label>
              <Input value={form.unit_type} onChange={(e) => update({ unit_type: e.target.value })} placeholder="e.g. grams, pieces" />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>Initial Quantity</Label>
              <Input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => update({ quantity: Number(e.target.value) })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input type="number" min="0" step="0.01" value={form.low_stock_threshold} onChange={(e) => update({ low_stock_threshold: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Cost per Unit (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={(e) => update({ cost_per_unit: e.target.value })} placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => update({ brand: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={form.source} onChange={(e) => update({ source: e.target.value })} placeholder="e.g. Amazon" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => update({ supplier: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => update({ sku: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="Optional notes..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Add Material"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}