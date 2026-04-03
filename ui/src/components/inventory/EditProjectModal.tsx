import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProject } from "../../services/inventoryApi";
import { getCookie } from "../../services/api";
import { Project } from "../../types/inventory";

type Product = { id: number; title: string };

type Props = {
  project: Project;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditProjectModal({ project, onClose, onSaved }: Props) {
  const [name, setName] = useState(project.name);
  const [productId, setProductId] = useState<number | "">(project.product ?? "");
  const [notes, setNotes] = useState(project.notes ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/product-list/?page_size=100", {
      credentials: "include",
      headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
    })
      .then((r) => r.json())
      .then((data) => setProducts(data.results ?? data))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await updateProject(project.id, {
        name,
        product: productId || null,
        notes: notes || null,
      });
      toast.success("Project updated");
      onSaved();
    } catch {
      toast.error("Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Edit Project — {project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Miffy Plushie" />
          </div>

          <div className="space-y-2">
            <Label>Linked Product <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : "")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">— None —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Keeps quantities in sync with the linked product listing.</p>
          </div>

          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this project..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}