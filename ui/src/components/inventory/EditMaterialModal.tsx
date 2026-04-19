import { useState, useRef } from "react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { ImagePlus, X } from "lucide-react";

import { updateMaterial } from "../../services/inventoryApi";
import type { RawMaterial } from "../../types/inventory";
import { TagsInput } from "@/components/ui/tags-input";

type Props = {
  material: RawMaterial;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditMaterialModal({
  material,
  onClose,
  onSaved,
}: Props) {
  const [tags, setTags] = useState<string[]>(material.tags ?? []);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: material.name ?? "",
    unit_type: material.unit_type ?? "",

    quantity: String(material.quantity ?? ""),
    low_stock_threshold: String(material.low_stock_threshold ?? ""),

    cost_per_unit: String(material.cost_per_unit ?? ""),

    brand: material.brand ?? "",
    source: material.source ?? "",
    supplier: material.supplier ?? "",
    sku: material.sku ?? "",
    notes: material.notes ?? "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    material.photo_url ?? null
  );

  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<typeof form>) =>
    setForm((p) => ({ ...p, ...patch }));

  // ─────────────────────────────────────────────
  // SAFE INPUT HELPERS
  // ─────────────────────────────────────────────

  const handleNumberInput = (value: string, field: keyof typeof form) => {
    if (value === "") return update({ [field]: "" });

    // allow only numbers + one dot
    if (!/^\d*\.?\d*$/.test(value)) return;

    // prevent leading multiple dots
    if (value.startsWith(".")) value = "0" + value;

    update({ [field]: value });
  };

  const handleTwoDecimalInput = (value: string, field: keyof typeof form) => {
    if (value === "") return update({ [field]: "" });

    if (!/^\d*\.?\d*$/.test(value)) return;

    if (value.startsWith(".")) value = "0" + value;

    if (value.includes(".")) {
      const [int, dec] = value.split(".");
      value = `${int}.${dec.slice(0, 2)}`;
    }

    update({ [field]: value });
  };

  // ─────────────────────────────────────────────

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(material.photo_url ?? null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    if (!form.unit_type.trim()) return toast.error("Unit type required");

    try {
      setSaving(true);

      await updateMaterial(
        material.id,
        {
          ...form,
          tags,
          quantity: Number(form.quantity || 0),
          low_stock_threshold: Number(form.low_stock_threshold || 0),
          cost_per_unit: Number(form.cost_per_unit || 0),
        },
        photoFile ?? undefined
      );

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
          <DialogTitle>Edit Material</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* PHOTO */}
          <div className="space-y-2">
            <Label>Photo</Label>

            {photoPreview ? (
              <div className="relative h-36 w-full">
                <img
                  src={photoPreview}
                  className="w-full h-full object-cover rounded-md border border-neutral-200"
                />

                <button
                  aria-label="Remove photo"
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <button
                  aria-label="Replace photo"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded"
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
               aria-label="Upload photo"
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-md text-neutral-400"
              >
                <ImagePlus className="h-5 w-5 mb-1" />
                Upload photo
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhoto}
            />
          </div>

          {/* CORE */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>

            <div>
              <Label>Unit Type</Label>
              <Input
                value={form.unit_type}
                onChange={(e) => update({ unit_type: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                value={form.quantity}
                inputMode="decimal"
                onChange={(e) =>
                  handleNumberInput(e.target.value, "quantity")
                }
              />
            </div>

            <div>
              <Label>Low Stock</Label>
              <Input
                value={form.low_stock_threshold}
                inputMode="numeric"
                onChange={(e) =>
                  handleNumberInput(e.target.value, "low_stock_threshold")
                }
              />
            </div>
          </div>

          <div>
            <Label>Cost per unit</Label>
            <Input
              value={form.cost_per_unit}
              inputMode="decimal"
              onChange={(e) =>
                handleTwoDecimalInput(e.target.value, "cost_per_unit")
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Brand</Label>
              <Input
                value={form.brand}
                onChange={(e) => update({ brand: e.target.value })}
              />
            </div>

            <div>
              <Label>Source</Label>
              <Input
                value={form.source}
                onChange={(e) => update({ source: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Supplier</Label>
              <Input
                value={form.supplier}
                onChange={(e) => update({ supplier: e.target.value })}
              />
            </div>

            <div>
              <Label>SKU</Label>
              <Input
                value={form.sku}
                onChange={(e) => update({ sku: e.target.value })}
              />
            </div>
          </div>

        <div className="space-y-2">
        <Label>
            Tags <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>

        <TagsInput
            value={tags}
            onChange={setTags}
            placeholder="e.g. cotton, yarn, acrylic"
        />

        <p className="text-xs text-muted-foreground">
            Press Enter or comma to add tags
        </p>
        </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button aria-label="Cancel" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button aria-label="Save" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}