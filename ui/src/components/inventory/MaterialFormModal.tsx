import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TagsInput } from "@/components/ui/tags-input";
import { ImagePlus, X } from "lucide-react";
import { createMaterial, updateMaterial } from "../../services/inventoryApi";
import { RawMaterial } from "../../types/inventory";

type Props = {
  material?: RawMaterial;
  existingTags?: string[];
  onClose: () => void;
  onSaved: () => void;
};

export default function MaterialFormModal({ material, existingTags = [], onClose, onSaved }: Props) {
  const isEdit = !!material;
  const [form, setForm] = useState({
    name: material?.name ?? "",
    unit_type: material?.unit_type ?? "",
    quantity: material?.quantity ? String(material.quantity) : "",
    low_stock_threshold: material?.low_stock_threshold ? String(material.low_stock_threshold) : "",
    cost_per_unit: material?.cost_per_unit ?? "",
    brand: material?.brand ?? "",
    source: material?.source ?? "",
    supplier: material?.supplier ?? "",
    sku: material?.sku ?? "",
    notes: material?.notes ?? "",
    tags: material?.tags ?? [] as string[],
  });
  const [saving, setSaving] = useState(false);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(material?.photo_url ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<typeof form>) => setForm((p) => ({ ...p, ...patch }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    // If editing, keep showing existing photo until they save with a new one
    setPhotoPreview(isEdit ? (material?.photo_url ?? null) : null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.unit_type.trim()) { toast.error("Unit type is required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantity: form.quantity !== "" ? Number(form.quantity) : 0,
        low_stock_threshold: form.low_stock_threshold !== "" ? Number(form.low_stock_threshold) : null,
      };
      if (isEdit) {
        await updateMaterial(material.id, payload, photoFile ?? undefined);
        toast.success("Material updated");
      } else {
        await createMaterial(payload, photoFile ?? undefined);
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

          {/* ── Photo ── */}
          <div className="space-y-2">
            <Label>Photo <span className="text-muted-foreground font-normal">(optional)</span></Label>
            {photoPreview ? (
              <div className="relative w-full h-36">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-md border border-neutral-200"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {/* Allow replacing */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md px-2 py-0.5 text-xs transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-24 rounded-md border-2 border-dashed border-neutral-300 hover:border-neutral-400 text-neutral-400 hover:text-neutral-500 transition-colors"
              >
                <ImagePlus className="h-6 w-6 mb-1" aria-hidden="true" />
                <span className="text-xs">Click to upload</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* ── Name + Unit Type ── */}
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
              <Input
                type="number" min="0" step="0.01"
                value={form.quantity} placeholder="0"
                onChange={(e) => update({ quantity: e.target.value })}
                onFocus={(e) => e.target.select()}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Low Stock Threshold</Label>
              <Input
                type="number" min="0" step="0.01"
                value={form.low_stock_threshold} placeholder="0"
                onChange={(e) => update({ low_stock_threshold: e.target.value })}
                onFocus={(e) => e.target.select()}
              />
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
            <Label>Tags</Label>
            <TagsInput
              value={form.tags}
              onChange={(tags) => update({ tags })}
              suggestions={existingTags}
              placeholder="e.g. yarn, bead, paint"
            />
            <p className="text-xs text-muted-foreground">Type and press Enter or comma to add.</p>
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