import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown } from "lucide-react";
import { getMaterials, getProjectMaterials, addProjectMaterial, removeProjectMaterial } from "../../services/inventoryApi";
import { Project, ProjectMaterial, RawMaterial } from "../../types/inventory";
import { cn } from "@/lib/utils";

type Props = {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
};

export default function ProjectMaterialsModal({ project, onClose, onSaved }: Props) {
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [allMaterials, setAllMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  // combobox state
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quantityUsed, setQuantityUsed] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchMaterials = async () => {
    try {
      const [linked, all] = await Promise.all([
        getProjectMaterials(project.id),
        getMaterials(),
      ]);
      setMaterials(linked.results ?? linked);
      setAllMaterials(all.results ?? all);
    } catch {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, [project.id]);

  const available = allMaterials.filter(
    (m) => !materials.some((pm) => pm.material === m.id)
  );

  const filtered = available.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMaterial = allMaterials.find((m) => m.id === selectedId);

  const handleAdd = async () => {
    if (!selectedId) { toast.error("Select a material"); return; }
    setAdding(true);
    try {
      await addProjectMaterial(project.id, selectedId, quantityUsed ? Number(quantityUsed) : undefined);
      toast.success("Material added");
      setSelectedId(null);
      setQuantityUsed("");
      setSearch("");
      fetchMaterials();
    } catch {
      toast.error("Failed to add material");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (materialId: number) => {
    try {
      await removeProjectMaterial(project.id, materialId);
      toast.success("Material removed");
      fetchMaterials();
    } catch {
      toast.error("Failed to remove material");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Materials — {project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Linked materials list */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : materials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No materials linked yet.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {materials.map((pm) => (
                <div key={pm.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium">{pm.material_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pm.quantity_used != null
                        ? `${pm.quantity_used} ${pm.material_unit_type} per make`
                        : "Quantity per make not set"}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove material: ${pm.material_name}`}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 border-red-200 shrink-0"
                    onClick={() => handleRemove(pm.material)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          {available.length > 0 && (
            <>
              <div className="border-t border-border pt-4 space-y-3">
                <Label>Add Material</Label>

                {/* Combobox */}
                <div className="relative">
                  <button
                    aria-label="Select material to add"
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <span className={selectedMaterial ? "text-foreground" : "text-muted-foreground"}>
                      {selectedMaterial ? `${selectedMaterial.name} (${selectedMaterial.unit_type})` : "Select a material..."}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                  </button>

                  {open && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-[hsl(var(--popover))] shadow-md">
                      <div className="p-2">
                        <input
                          autoFocus
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search materials..."
                          className="w-full rounded border border-input bg-transparent px-2 py-1 text-sm outline-none"
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filtered.length === 0 ? (
                          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No materials found.</p>
                        ) : (
                          filtered.map((m) => (
                            <button
                              aria-label={`Select material: ${m.name}`}
                              key={m.id}
                              type="button"
                              onClick={() => { setSelectedId(m.id); setOpen(false); setSearch(""); }}
                              className={cn(
                                "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors",
                                selectedId === m.id && "bg-muted"
                              )}
                            >
                              <Check className={cn("h-4 w-4 shrink-0", selectedId === m.id ? "opacity-100" : "opacity-0")} />
                              <span>{m.name}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{m.quantity} {m.unit_type}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Qty Used Per Make <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantityUsed}
                    onChange={(e) => setQuantityUsed(e.target.value)}
                    placeholder="Leave blank if unknown"
                  />
                  {selectedMaterial && (
                    <p className="text-xs text-muted-foreground">
                      Unit: {selectedMaterial.unit_type} — In stock: {selectedMaterial.quantity} {selectedMaterial.unit_type}
                    </p>
                  )}
                </div>

                <Button aria-label="Add material" onClick={handleAdd} disabled={adding || !selectedId} size="sm">
                  {adding ? "Adding..." : "Add Material"}
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button aria-label="Close" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}