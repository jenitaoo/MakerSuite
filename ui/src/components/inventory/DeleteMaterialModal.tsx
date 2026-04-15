import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { deleteMaterial } from "../../services/inventoryApi";
import { RawMaterial } from "../../types/inventory";

type Props = {
  material: RawMaterial;
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteMaterialModal({ material, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMaterial(material.id);
      toast.success(`"${material.name}" deleted`);
      onDeleted();
    } catch (err: any) {
      toast.error(
        err.message?.includes("linked")
          ? "Remove this material from all projects before deleting."
          : "Failed to delete material"
      );
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Delete "{material.name}"?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this item?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <p>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">"{material.name}"</span> from
            MakerSuite.
          </p>
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-xs">
            If this material is linked to any projects, you must remove it from those projects first.
          </div>
          <p className="text-destructive font-medium">This action cannot be undone.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button
            variant="destructive"
            style={{ backgroundColor: "#b84141", color: "#ffffff" }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Material"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}