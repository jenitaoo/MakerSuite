import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { updateMaterial } from "../../services/inventoryApi";
import { RawMaterial } from "../../types/inventory";

type Props = {
  material: RawMaterial;
  onClose: () => void;
  onSaved: () => void;
};

export default function MaterialDetailModal({ material, onClose, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    notes: material.notes ?? "",
    supplier: material.supplier ?? "",
    sku: material.sku ?? "",
    cost_per_unit: material.cost_per_unit ?? "",
    low_stock_threshold: material.low_stock_threshold ?? 10,
  });
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMaterial(material.id, form);
      toast.success("Material updated");
      onSaved();
    } catch {
      toast.error("Failed to update material");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>{material.name}</DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Summary row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className={material.is_low_stock ? "text-amber-600 border-amber-300 bg-amber-50" : "text-green-600 border-green-300 bg-green-50"}>
              {material.is_low_stock ? "Low Stock" : "OK"}
            </Badge>
            <span className="text-sm font-medium">{material.quantity} {material.unit_type} in stock</span>
          </div>

          <Separator />

          {/* Read-only fields */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {[
              ["Unit Type", material.unit_type],
              ["Brand", material.brand ?? "—"],
              ["Source", material.source ?? "—"],
              ["Created", new Date(material.created_at).toLocaleDateString()],
              ["Last Updated", new Date(material.updated_at).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Editable fields */}
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cost per Unit (€)</Label>
                  <Input type="number" step="0.01" value={form.cost_per_unit} onChange={(e) => update({ cost_per_unit: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Threshold</Label>
                  <Input type="number" step="0.01" value={form.low_stock_threshold} onChange={(e) => update({ low_stock_threshold: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input value={form.supplier} onChange={(e) => update({ supplier: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => update({ sku: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {[
                ["Cost per Unit", material.cost_per_unit ? `€${material.cost_per_unit}` : "—"],
                ["Low Stock Threshold", `${material.low_stock_threshold ?? "—"} ${material.unit_type}`],
                ["Supplier", material.supplier ?? "—"],
                ["SKU", material.sku ?? "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
              {material.notes && (
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes</p>
                  <p className="font-medium">{material.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Close</Button>
              <Button onClick={() => setEditing(true)}>Edit Details</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}