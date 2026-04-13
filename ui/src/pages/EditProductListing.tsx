import { useState, useRef, useEffect, useContext } from "react";
import { useParams, useNavigate, useBlocker } from "react-router-dom";
import toast from "react-hot-toast";
import { useProductWithListings, ExternalListing, EtsyRaw } from "../hooks/useProductWithListings";
import { getCookie } from "../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AuthContext } from "../context/AuthContext";

const MAX_IMAGES = 10;

type Tab = "overview" | "editor" | "etsy-preview" | "shopify";

type FormState = {
  title: string;
  description: string;
  price: string;
  quantity: string;
  sku: string;
  tags: string[];
  materials: string[];
  who_made: string;
  when_made: string;
  should_auto_renew: boolean;
  is_taxable: boolean;
  listing_type: string;
};

type NewImagePreview = {
  file: File;
  preview: string;
};

export default function EditProductListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const { product, externalListings, loading, error, refetch } = useProductWithListings(id);

  const etsyListing: ExternalListing | undefined = externalListings.find((l) => l.platform === "Etsy");
  const raw: EtsyRaw | undefined = etsyListing?.raw;

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [form, setForm] = useState<FormState | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [materialsInput, setMaterialsInput] = useState("");
  const [uploadingEtsy, setUploadingEtsy] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [newImages, setNewImages] = useState<NewImagePreview[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Linked project data fetched separately
  const [linkedProject, setLinkedProject] = useState<any>(null);

  const blocker = useBlocker(isDirty);
  if (blocker.state === "blocked") {
    const confirmed = window.confirm("You have unsaved changes. Leave anyway?");
    if (confirmed) blocker.proceed();
    else blocker.reset();
  }

  if (product && !form) {
    setForm({
      title: product.title,
      description: product.description ?? "",
      price: product.internal_price,
      quantity: product.internal_quantity,
      sku: product.sku ?? "",
      tags: etsyListing?.etsy_tags?.length ? etsyListing.etsy_tags : (raw?.tags ?? []),
      materials: etsyListing?.etsy_materials?.length ? etsyListing.etsy_materials : (raw?.materials ?? []),
      who_made: etsyListing?.etsy_who_made || raw?.who_made || "i_did",
      when_made: etsyListing?.etsy_when_made || raw?.when_made || "made_to_order",
      should_auto_renew: etsyListing?.etsy_should_auto_renew ?? raw?.should_auto_renew ?? true,
      is_taxable: etsyListing?.etsy_is_taxable ?? raw?.is_taxable ?? true,
      listing_type: etsyListing?.etsy_listing_type || raw?.listing_type || "physical",
    });
  }

  useEffect(() => {
    window.scrollTo(0, 0);
    if (form) {
      setTagsInput(form.tags.join(", "));
      setMaterialsInput(form.materials.join(", "));
    }
  }, [!!form]);

  // Fetch linked project when product loads
  useEffect(() => {
    if (!product?.linked_project_id) return;
    fetch(`/api/inventory/projects/${product.linked_project_id}/`, {
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json())
      .then(setLinkedProject)
      .catch(() => {});
  }, [product?.linked_project_id]);

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => prev ? { ...prev, ...patch } : prev);
    setIsDirty(true);
  };

  const etsyImages = raw?.images?.sort((a, b) => a.rank - b.rank) ?? [];
  const existingCount = product?.images?.length ?? 0;
  const etsyImageCount = existingCount === 0 ? etsyImages.length : 0;
  const effectiveCount = existingCount + etsyImageCount + newImages.length;
  const slotsLeft = MAX_IMAGES - effectiveCount;

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (files.length > slotsLeft) {
      toast.error(`You can only add ${slotsLeft} more photo${slotsLeft !== 1 ? "s" : ""} (max ${MAX_IMAGES} total).`);
      return;
    }
    setNewImages((prev) => [...prev, ...files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))]);
    setIsDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDeleteExistingImage = async (imageId: number) => {
    if (!id) return;
    const res = await fetch(`/api/products/${id}/images/${imageId}/`, {
      method: "DELETE",
      credentials: "include",
      headers: { "X-CSRFToken": getCookie("csrftoken") ?? "" },
    });
    if (res.ok) { toast.success("Photo removed"); refetch(); }
    else toast.error("Failed to remove photo");
  };

  const handleSaveInternally = async () => {
    if (!form || !id) return;
    const body = new FormData();
    body.append("title", form.title);
    body.append("description", form.description);
    body.append("internal_price", String(parseInt(String(form.quantity)) || 0));
    body.append("internal_quantity", String(parseInt(String(form.quantity)) || 0));
    body.append("sku", form.sku);

    await toast.promise(
      fetch(`/api/products/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        body,
      }).then(async (res) => { if (!res.ok) throw new Error(await res.text()); }),
      { loading: "Saving...", success: "Saved internally", error: "Failed to save" }
    );

    if (newImages.length > 0) {
      const imageData = new FormData();
      newImages.forEach((img) => imageData.append("images", img.file));
      const imgRes = await fetch(`/api/products/${id}/images/`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        body: imageData,
      });
      if (!imgRes.ok) {
        const err = await imgRes.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to upload photos");
      } else {
        setNewImages([]);
        toast.success(`${newImages.length} photo${newImages.length !== 1 ? "s" : ""} uploaded`);
      }
    }

    setIsDirty(false);
    refetch();
  };

  const handleEtsyError = (data: any) => {
    if (data.error === "etsy_token_expired") {
      toast.error("Your Etsy session has expired. Reconnect Etsy in your Profile to continue.", { duration: Infinity });
      return;
    }
    if (data.error === "etsy_not_connected") {
      toast.error("No Etsy account connected. Go to your Profile to connect Etsy.", { duration: Infinity });
      return;
    }
    toast.error(data.error ?? "Failed to push to Etsy");
  };

  const handleSaveToEtsy = async () => {
    if (!form || !id) return;
    const res = await fetch(`/api/products/${id}/push-to-etsy/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
      body: JSON.stringify({
        tags: form.tags, materials: form.materials, who_made: form.who_made,
        when_made: form.when_made, should_auto_renew: form.should_auto_renew,
        is_taxable: form.is_taxable, listing_type: form.listing_type,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      handleEtsyError(data);
      return;
    }
    toast.success("Saved to Etsy");
    setIsDirty(false);
    refetch();
  };

  const handleSaveToAll = async () => {
    await handleSaveInternally();
    await handleSaveToEtsy();
  };

  if (loading) return <p className="text-center text-muted-foreground py-12">Loading...</p>;
  if (error || !product || !form) {
    return <p className="text-center text-destructive py-12">{error ?? "Product not found"}</p>;
  }

  // Overview calculations
  const materialCost = linkedProject?.material_cost_per_unit ? parseFloat(linkedProject.material_cost_per_unit) : null;
  const avgMins = linkedProject?.avg_duration_minutes ?? null;
  const rate = parseFloat(auth?.user?.hourly_rate ?? "14.15");
  const labourCost = avgMins ? (avgMins / 60) * rate : null;
  const minimumPrice = materialCost !== null && labourCost !== null
    ? materialCost + labourCost
    : materialCost ?? labourCost ?? null;
  const currentPrice = product.internal_price ? parseFloat(product.internal_price) : null;
  const isPriceTooLow = minimumPrice !== null && currentPrice !== null && currentPrice < minimumPrice;

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const tabs: { key: Tab; label: string; disabled?: boolean }[] = [
    { key: "overview", label: "Overview" },
    { key: "editor", label: "Product Editor" },
    { key: "etsy-preview", label: "Etsy Preview" },
    { key: "shopify", label: "Shopify", disabled: true },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div>
        <button type="button" className="text-white text-sm mb-2 hover:underline" onClick={() => navigate("/marketplace")}>
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white">{product.title}</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label, disabled }) => (
          <button key={key} type="button" disabled={disabled}
            onClick={() => !disabled && setActiveTab(key)}
            className={[
              "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
              disabled
                ? "border-transparent text-muted-foreground opacity-40 cursor-not-allowed"
                : activeTab === key
                ? "border-[hsl(var(--primary))] text-white"
                : "border-transparent text-white/70 hover:text-white",
            ].join(" ")}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Overview ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <Card className="bg-[#fdf8f6]">
            <CardHeader>
              <CardTitle>Product Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                {[
                  { label: "In Stock", value: product.internal_quantity },
                  { label: "Units Made", value: linkedProject?.units_made ?? "—" },
                  { label: "Units Sold", value: linkedProject?.units_sold ?? "—" },
                  { label: "Your Price", value: product.internal_price ? `€${product.internal_price}` : "—" },
                  { label: "Avg Make Time", value: formatDuration(avgMins) },
                  { label: "Material Cost/Unit", value: materialCost !== null ? `€${materialCost.toFixed(2)}` : "—" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>

              {linkedProject ? (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Linked Studio project</span>
                    <button
                      className="text-[hsl(var(--primary))] hover:underline font-medium"
                      onClick={() => navigate(`/studio/projects/${linkedProject.id}`)}
                    >
                      {linkedProject.name} →
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No Studio project linked. Link a project to see production data here.
                </p>
              )}

              {minimumPrice !== null && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Material Cost (€)</p>
                      <p className="font-medium">{materialCost !== null ? `€${materialCost.toFixed(2)}` : "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Labour</p>
                      <p className="font-medium">{labourCost !== null ? `€${labourCost.toFixed(2)}` : "—"}</p>
                      {avgMins && <p className="text-xs text-muted-foreground">{formatDuration(avgMins)} × €{rate.toFixed(2)}/hr</p>}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Suggested Minimum</p>
                      <p className="font-semibold text-[hsl(var(--primary))]">€{minimumPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  {isPriceTooLow && (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      ⚠ Your price (€{currentPrice?.toFixed(2)}) is below the suggested minimum.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tab 1: Product Editor ── */}
      {activeTab === "editor" && (
        <div className="space-y-6">

          <Card className="bg-[#fdf8f6]">
            <CardHeader><CardTitle>Connections</CardTitle></CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Button variant={etsyListing ? "default" : "outline"} size="sm" disabled={!etsyListing}>
                {etsyListing ? "Etsy ↗" : "Etsy (not linked)"}
              </Button>
              <Button variant="outline" size="sm" disabled>Shopify (coming soon)</Button>
            </CardContent>
          </Card>

          <Card className="bg-[#fdf8f6]">
            <CardHeader><CardTitle>Product Photos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <span className="text-xs text-muted-foreground">{effectiveCount}/{MAX_IMAGES} photos</span>

              {(product.images?.length > 0 || newImages.length > 0) ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {product.images?.map((img, i) => (
                    <div key={img.id} className="relative group">
                      <img src={img.url} alt={`Photo ${i + 1}`} className="w-full aspect-square object-cover rounded-md border border-border" />
                      <button type="button" onClick={() => handleDeleteExistingImage(img.id)}
                        className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">Main</span>}
                    </div>
                  ))}
                  {newImages.map((img, i) => (
                    <div key={`new-${i}`} className="relative group">
                      <img src={img.preview} alt={`New photo ${i + 1}`} className="w-full aspect-square object-cover rounded-md border-2 border-dashed border-[hsl(var(--primary))]" />
                      <button type="button" onClick={() => handleRemoveNewImage(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">New</span>
                    </div>
                  ))}
                </div>
              ) : etsyImages.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {etsyImages.map((img, i) => (
                    <div key={img.listing_image_id} className="relative">
                      <img src={img["url_570xN"]} alt={img.alt_text ?? `Photo ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-md border border-border" />
                      {i === 0 && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">Main</span>}
                    </div>
                  ))}
                </div>
              ) : null}

              {slotsLeft > 0 ? (
                <label className="flex flex-col items-center justify-center w-full h-24 rounded-md border-2 border-dashed border-border cursor-pointer hover:bg-muted transition-colors">
                  <span className="text-sm text-muted-foreground">
                    {effectiveCount === 0 ? "Click to upload photos" : `Add more (${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left)`}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG or WEBP</span>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleNewImageChange} />
                </label>
              ) : (
                <p className="text-xs text-muted-foreground">Maximum of {MAX_IMAGES} photos reached.</p>
              )}

              {newImages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {newImages.length} new photo{newImages.length !== 1 ? "s" : ""} queued — will be saved when you hit Save Internally or Save to All, and pushed to Etsy on the next Save to Etsy.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#fdf8f6]">
            <CardHeader><CardTitle>Product Fields</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => update({ title: e.target.value })} placeholder="Product title" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={6} value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="Product description" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Price (€)</Label>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.price} onChange={(e) => update({ price: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min="0" placeholder="0" value={form.quantity} onChange={(e) => update({ quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input placeholder="e.g. WHI" value={form.sku} onChange={(e) => update({ sku: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#fdf8f6]">
            <CardHeader>
              <CardTitle>
                Etsy Fields{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (Optional for internal product listings, but all required if you want to publish to Etsy)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tags</Label>
                <Input value={tagsInput}
                  onChange={(e) => { setTagsInput(e.target.value); setIsDirty(true); }}
                  onBlur={() => update({ tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean) })}
                  placeholder="e.g. Handmade, Jewellery, Gift" />
              </div>
              <div className="space-y-2">
                <Label>Materials</Label>
                <Input value={materialsInput}
                  onChange={(e) => { setMaterialsInput(e.target.value); setIsDirty(true); }}
                  onBlur={() => update({ materials: materialsInput.split(",").map((m) => m.trim()).filter(Boolean) })}
                  placeholder="e.g. Seed Beads, Glass" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Who Made</Label>
                  <Select value={form.who_made} onValueChange={(v) => update({ who_made: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="i_did">I did</SelectItem>
                      <SelectItem value="someone_else">Someone else</SelectItem>
                      <SelectItem value="collective">A collective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>When Made</Label>
                  <Select value={form.when_made} onValueChange={(v) => update({ when_made: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="made_to_order">Made to order</SelectItem>
                      <SelectItem value="2020_2025">2020–2025</SelectItem>
                      <SelectItem value="2010_2019">2010–2019</SelectItem>
                      <SelectItem value="2000_2009">2000–2009</SelectItem>
                      <SelectItem value="before_2000">Before 2000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Listing Type</Label>
                  <Select value={form.listing_type} onValueChange={(v) => update({ listing_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="physical">Physical</SelectItem>
                      <SelectItem value="digital">Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.should_auto_renew} onCheckedChange={(v) => update({ should_auto_renew: !!v })} />
                  <Label>Auto Renew</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={form.is_taxable} onCheckedChange={(v) => update({ is_taxable: !!v })} />
                  <Label>Taxable</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={handleSaveToAll}>Save to All</Button>
            <Button variant="outline" style={{ backgroundColor: "#fdf8f6" }} onClick={handleSaveInternally}>Save Internally</Button>
            <Button variant="outline" style={{ backgroundColor: "#fdf8f6" }} onClick={handleSaveToEtsy}>Save to Etsy</Button>
            <Button variant="outline" style={{ backgroundColor: "#fdf8f6" }} disabled>Save to Shopify (Disabled)</Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Changes save independently — your internal price and Etsy price can differ.
          </p>
        </div>
      )}

      {/* ── Tab 2: Etsy Preview ── */}
      {activeTab === "etsy-preview" && (
        <Card className="bg-[#fdf8f6]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Last Synced Etsy Listing</CardTitle>
              {raw?.url && (
                <a href={raw.url} target="_blank" rel="noreferrer" className="text-sm text-[hsl(var(--primary))] hover:underline">
                  View on Etsy ↗
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!etsyListing ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No Etsy listing linked to this product yet.</p>
            ) : (
              <>
                {etsyImages.length > 0 && (
                  <img src={etsyImages[0]["url_570xN"]} alt={product.title} className="w-full max-h-96 object-contain rounded-md" />
                )}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">{raw?.title}</h2>
                  <p className="text-xl font-bold text-[hsl(var(--primary))]">
                    {raw?.price ? `${(raw.price.amount / raw.price.divisor).toFixed(2)} ${raw.price.currency_code}` : "—"}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{raw?.views} views</span>
                    <span>{raw?.num_favorers} favourites</span>
                    <span>{raw?.quantity} in stock</span>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {raw?.tags?.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Materials</p>
                    <div className="flex flex-wrap gap-1">
                      {raw?.materials?.map((m) => <Badge key={m} variant="outline">{m}</Badge>)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</p>
                    <p className="text-sm whitespace-pre-wrap">{raw?.description}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}