import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X } from "lucide-react";
import { getCookie } from "../../services/api";
import { createProject, uploadProjectImage } from "../../services/inventoryApi";
import { TagsInput } from "@/components/ui/tags-input";
import { API_URL } from "../../services/api";

type Product = { id: number; title: string };
type Props = { onClose: () => void; onCreated: () => void };

export default function CreateProjectModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [productId, setProductId] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const newProject = await createProject({
        name,
        product: productId || null,
        notes: notes || null,
        tags,
      });

      if (imageFile) {
        await uploadProjectImage(newProject.id, imageFile);
      }

      toast.success("Project created");
      onCreated();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Photo <span className="text-muted-foreground font-normal">(optional)</span></Label>
            {imagePreview ? (
              <div className="relative w-full h-36">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-md border border-neutral-200" />
                <button type="button" onClick={clearImage} className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-0.5 transition-colors" aria-label="Remove image">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-24 rounded-md border-2 border-dashed border-neutral-300 hover:border-neutral-400 text-neutral-400 hover:text-neutral-500 transition-colors">
                <ImagePlus className="h-6 w-6 mb-1" aria-hidden="true" />
                <span className="text-xs">Click to upload</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Miffy Plushie, Light Tea Rose Rings" />
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
            <p className="text-xs text-muted-foreground">Link this project to a product listing to keep quantities in sync.</p>
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
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Creating..." : "Create Project"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}