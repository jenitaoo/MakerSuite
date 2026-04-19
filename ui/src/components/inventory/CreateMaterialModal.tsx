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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  material?: RawMaterial;
  existingTags?: string[];
  onClose: () => void;
  onSaved: () => void;
};


export default function CreateMaterialModal({ material, existingTags = [], onClose, onSaved }: Props) {
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
  const isValidUnit = /^[a-z]+$/.test(form.unit_type);

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
                  aria-label="Replace photo"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md px-2 py-0.5 text-xs transition-colors"
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                aria-label="Upload photo"
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

          {/* Name - full width */}
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="e.g. Brown Yarn"
            />
          </div>

          {/* Unit Type + Initial Quantity */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Unit Type *</Label>
              <Input
                value={form.unit_type}
                onChange={(e) => {
                  let value = e.target.value.toLowerCase().replace(/[^a-z]/g, "");
                  update({ unit_type: value });
                }}
                placeholder="e.g. grams, pieces"
              />
              {!isValidUnit && form.unit_type.length > 0 && (
                <p className="text-red-500 text-sm">
                  Only lowercase letters allowed (no spaces or numbers)
                </p>
              )}
            </div>
          </div>

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
              <div className="flex items-center gap-2 mt-4">
                <Label>Cost Per Unit (€)</Label>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-4 w-4 rounded-full bg-neutral-300 text-white flex items-center justify-center text-xs cursor-help">
                      ?
                    </div>
                  </TooltipTrigger>

                  <TooltipContent side="right" className="max-w-xs">
                    <p>Cost per single unit of measurement.</p>
                    <p className="text-xs mt-1">
                      Example: If 50g cost €3.50, then cost per gram = €3.50 ÷ 50 = €0.07
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.cost_per_unit}
                onChange={(e) => {
                  let val = e.target.value;

                  // allow empty input
                  if (val === "") {
                    update({ cost_per_unit: "" });
                    return;
                  }

                  // only allow numbers + one dot
                  if (!/^\d*\.?\d*$/.test(val)) return;

                  // limit to 2 decimal places
                  if (val.includes(".")) {
                    const [int, dec] = val.split(".");
                    val = `${int}.${dec.slice(0, 2)}`;
                  }

                  update({ cost_per_unit: val });
                }}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input value={form.brand} onChange={(e) => update({ brand: e.target.value })} placeholder="e.g. Drops" />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={form.source} onChange={(e) => update({ source: e.target.value })} placeholder="e.g. Woolly Castle's website" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={(e) => update({ supplier: e.target.value })} placeholder="e.g. Woolly Castle" />
            </div>
            <div className="space-y-2">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => update({ sku: e.target.value })} placeholder="e.g. DROPS-Brushed-Alpaca-Silk" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <TagsInput
              value={form.tags}
              onChange={(tags) => update({ tags })}
              suggestions={existingTags}
              placeholder="e.g. crochet, embroidery, ceramics, jewellery"
            />
            <p className="text-xs text-muted-foreground">Type and press Enter or comma to add.</p>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="e.g. Where do you keep it? Is it in good condition?" />
          </div>
        </div>

        <DialogFooter>
          <Button aria-label="Cancel" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button aria-label="Save" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Add Material"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}