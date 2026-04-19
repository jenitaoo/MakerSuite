import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X } from "lucide-react";
import { updateProject, uploadProjectImage, deleteProjectImage } from "../../services/inventoryApi";
import { getCookie } from "../../services/api";
import { Project, ProjectImage } from "../../types/inventory";
import { TagsInput } from "@/components/ui/tags-input";
import { API_URL } from "../../services/api";

type Product = { id: number; title: string };
type Props = { project: Project; onClose: () => void; onSaved: () => void };

export default function EditProjectModal({ project, onClose, onSaved }: Props) {
  const [name, setName] = useState(project.name);
  const [productId, setProductId] = useState<number | "">(project.product ?? "");
  const [notes, setNotes] = useState(project.notes ?? "");
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  // Image state — start from existing images
  const [existingImages, setExistingImages] = useState<ProjectImage[]>(project.images ?? []);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const originalProductId = project.product ? Number(project.product) : 0;

  const [tags, setTags] = useState<string[]>(project.tags ?? []);


  useEffect(() => {
    fetch(`${API_URL}/api/product-list/?page_size=100`, {
      credentials: "include",
      headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
    })
      .then((r) => r.json())
      .then((data) => setProducts(data.results ?? data))
      .catch(() => {});
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFile(file);
    setNewPreview(URL.createObjectURL(file));
  };

  const handleDeleteExisting = async (img: ProjectImage) => {
    try {
      await deleteProjectImage(project.id, img.id);
      setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      await updateProject(project.id, {
        name,
        product: productId || null,
        notes: notes || null,
        tags,
      });

      if (newFile) {
        await uploadProjectImage(project.id, newFile);
      }

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
          <DialogTitle>Edit Project: {project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Existing images */}
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <Label>Current Photo</Label>
              <div className="flex flex-wrap gap-2">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative h-20 w-20">
                    <img
                      src={img.image_url || ""}
                      alt=""
                      className="h-full w-full object-cover rounded-md border border-neutral-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteExisting(img)}
                      className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 transition-colors"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New image upload */}
          <div className="space-y-2">
            <Label>{existingImages.length > 0 ? "Replace / Add Photo" : "Photo"} <span className="text-muted-foreground font-normal">(optional)</span></Label>
            {newPreview ? (
              <div className="relative w-full h-36">
                <img src={newPreview} alt="Preview" className="w-full h-full object-cover rounded-md border border-neutral-200" />
                <button
                  type="button"
                  onClick={() => { setNewFile(null); setNewPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 transition-colors"
                  aria-label="Remove new image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                aria-label="Upload photo"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-20 rounded-md border-2 border-dashed border-neutral-300 hover:border-neutral-400 text-neutral-600 hover:text-neutral-500 transition-colors"
              >
                <ImagePlus className="h-5 w-5 mb-1" aria-hidden="true" />
                <span className="text-xs">Click to upload</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

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
            {productId && Number(productId) !== Number(originalProductId) && (
              <p className="text-xs text-amber-600">
                ⚠ Linking this product will auto-create a make log from its current stock quantity.
              </p>
            )}
          </div>

        <div className="space-y-2">
          <Label>Tags <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <TagsInput value={tags} onChange={setTags} placeholder="e.g. crochet, jewellery, seasonal" />
          <p className="text-xs text-muted-foreground">Type and press Enter or comma to add.</p>
        </div>

          <div className="space-y-2">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this project..." />
          </div>
        </div>

        <DialogFooter>
          <Button aria-label="Cancel" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button aria-label="Save" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}