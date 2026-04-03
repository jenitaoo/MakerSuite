import { useState } from "react";
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

type EtsyEditableFields = {
  title: string;
  description: string;
  tags: string[];
  materials: string[];
  who_made: string;
  when_made: string;
  should_auto_renew: boolean;
  is_taxable: boolean;
  listing_type: string;
};

type InternalEditableFields = {
  title: string;
  description: string;
  internal_price: string;
  internal_quantity: number;
  sku: string;
};

export default function EditProductListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { product, externalListings, loading, error, refetch } = useProductWithListings(id);

  const etsyListing: ExternalListing | undefined = externalListings.find((l) => l.platform === "Etsy");
  const raw: EtsyRaw | undefined = etsyListing?.raw;

  const [internal, setInternal] = useState<InternalEditableFields | null>(null);
  const [etsy, setEtsy] = useState<EtsyEditableFields | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const blocker = useBlocker(isDirty);
  if (blocker.state === "blocked") {
    const confirmed = window.confirm("You have unsaved changes. Leave anyway?");
    if (confirmed) blocker.proceed();
    else blocker.reset();
  }

  if (product && !internal) {
    setInternal({
      title: product.title,
      description: product.description ?? "",
      internal_price: product.internal_price,
      internal_quantity: product.internal_quantity,
      sku: product.sku ?? "",
    });
  }

  if (raw && !etsy) {
    setEtsy({
      title: raw?.title ?? product?.title ?? "",
      description: raw?.description ?? product?.description ?? "",
      tags: raw?.tags ?? [],
      materials: raw?.materials ?? [],
      who_made: raw?.who_made ?? "i_did",
      when_made: raw?.when_made ?? "made_to_order",
      should_auto_renew: raw?.should_auto_renew ?? true,
      is_taxable: raw?.is_taxable ?? true,
      listing_type: raw?.listing_type ?? "physical",
    });
  }

  const images = raw?.images?.sort((a, b) => a.rank - b.rank) ?? [];

  const updateEtsy = (patch: Partial<EtsyEditableFields>) => {
    setEtsy((prev) => prev ? { ...prev, ...patch } : prev);
    setIsDirty(true);
  };

  const updateInternal = (patch: Partial<InternalEditableFields>) => {
    setInternal((prev) => prev ? { ...prev, ...patch } : prev);
    setIsDirty(true);
  };

  const handleSaveInternally = async () => {
    if (!internal || !id) return;
    await toast.promise(
      fetch(`/api/products/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        body: JSON.stringify({
          title: internal.title,
          description: internal.description,
          internal_price: internal.internal_price,
          internal_quantity: internal.internal_quantity,
          sku: internal.sku,
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        setIsDirty(false);
      }),
      { loading: "Saving internally...", success: "Saved to database", error: "Failed to save internally" }
    );
  };

  const handleSaveToEtsy = async () => {
    if (!id) return;
    await toast.promise(
      fetch(`/api/products/${id}/push-to-etsy/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        setIsDirty(false);
      }),
      { loading: "Pushing to Etsy...", success: "Saved to Etsy", error: "Failed to push to Etsy" }
    );
    refetch();
  };

  const handleSaveToAll = async () => {
    await handleSaveInternally();
    await handleSaveToEtsy();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !etsyListing) return;
    const formData = new FormData();
    formData.append("image", file);
    formData.append("rank", "1");
    setUploadingImage(true);
    await toast.promise(
      fetch(`/api/etsy/shops/${etsyListing.raw.shop_id}/listings/${etsyListing.platform_listing_id}/images/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": getCookie("csrftoken") ?? "" },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
      }),
      { loading: "Uploading image...", success: "Image uploaded to Etsy", error: "Failed to upload image" }
    ).finally(() => setUploadingImage(false));
  };

  if (loading) return <p className="text-center text-muted-foreground py-12">Loading...</p>;
  if (error || !product || !internal) {
    return <p className="text-center text-destructive py-12">{error ?? "Product not found"}</p>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          className="text-white text-sm mb-2 hover:underline"
          onClick={() => previewOpen ? setPreviewOpen(false) : navigate("/crosslist")}
        >
          ← {previewOpen ? "Back to Editor" : "Back"}
        </button>
        <h1 className="text-3xl font-bold text-white">{product.title}</h1>
      </div>

      {!previewOpen && (
        <div className="space-y-6">

          {/* Connections */}
          <Card className="bg-[#fdf8f6]">
            <CardHeader>
              <CardTitle>Connections</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Button
                variant={etsyListing ? "default" : "outline"}
                size="sm"
                onClick={() => etsyListing && setPreviewOpen(true)}
                disabled={!etsyListing}
              >
                {etsyListing ? "Etsy ↗" : "Etsy (not linked)"}
              </Button>
              <Button variant="outline" size="sm" disabled>
                Shopify (coming soon)
              </Button>
            </CardContent>
          </Card>

          {/* Product Photos */}
          <Card className="bg-[#fdf8f6]">
            <CardHeader>
              <CardTitle>Product Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {images.length > 0 ? (
                <div className="space-y-3">
                  <img
                    src={images[selectedImage]["url_570xN"]}
                    alt={images[selectedImage]?.alt_text ?? product.title}
                    className="w-full max-h-80 object-contain rounded-md border border-border"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {images.map((img, i) => (
                      <img
                        key={img.listing_image_id}
                        src={img["url_570xN"]}
                        alt={img.alt_text ?? `Photo ${i + 1}`}
                        onClick={() => setSelectedImage(i)}
                        className={`w-16 h-16 object-cover rounded cursor-pointer border-2 transition-colors ${
                          i === selectedImage ? "border-[hsl(var(--primary))]" : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {etsyListing ? "No photos available" : "No Etsy listing linked — push to Etsy to add photos"}
                </p>
              )}
              <div>
                <Label
                  className={`inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-border text-sm hover:bg-muted transition-colors ${
                    uploadingImage || !etsyListing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || !etsyListing}
                  />
                  {uploadingImage ? "Uploading..." : "Upload New Photo"}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Etsy Fields */}
          {etsy && (
            <Card className="bg-[#fdf8f6]">
              <CardHeader>
                <CardTitle>
                  Etsy Fields{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    synced from your Etsy listing
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={etsy.title} onChange={(e) => updateEtsy({ title: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea rows={8} value={etsy.description} onChange={(e) => updateEtsy({ description: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    value={etsy.tags.join(", ")}
                    onChange={(e) => updateEtsy({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Materials</Label>
                  <Input
                    value={etsy.materials.join(", ")}
                    onChange={(e) => updateEtsy({ materials: e.target.value.split(",").map((m) => m.trim()).filter(Boolean) })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Who Made</Label>
                    <Select value={etsy.who_made} onValueChange={(v) => updateEtsy({ who_made: v })}>
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
                    <Select value={etsy.when_made} onValueChange={(v) => updateEtsy({ when_made: v })}>
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
                    <Select value={etsy.listing_type} onValueChange={(v) => updateEtsy({ listing_type: v })}>
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
                    <Checkbox checked={etsy.should_auto_renew} onCheckedChange={(v) => updateEtsy({ should_auto_renew: !!v })} />
                    <Label>Auto Renew</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={etsy.is_taxable} onCheckedChange={(v) => updateEtsy({ is_taxable: !!v })} />
                    <Label>Taxable</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal Fields */}
          <Card className="bg-[#fdf8f6]">
            <CardHeader>
              <CardTitle>Internal Fields</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Internal Price (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={internal.internal_price}
                    onChange={(e) => updateInternal({ internal_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Internal Quantity</Label>
                  <Input
                    type="number"
                    value={internal.internal_quantity}
                    onChange={(e) => updateInternal({ internal_quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <Input value={internal.sku} onChange={(e) => updateInternal({ sku: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={handleSaveToAll}>Save to All</Button>
            <Button variant="outline" style={{ backgroundColor: "#fdf8f6" }} onClick={handleSaveInternally}>Save Internally</Button>
            <Button variant="outline" style={{ backgroundColor: "#fdf8f6" }} onClick={handleSaveToEtsy}>Save to Etsy</Button>
            <Button variant="outline" style={{ backgroundColor: "#fdf8f6" }} disabled>Save to Shopify (Disabled)</Button>
          </div>
        </div>
      )}

      {/* Etsy Preview */}
      {previewOpen && (
        <Card className="bg-[#fdf8f6]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Etsy Preview</CardTitle>
              {raw?.url && (
                <a href={raw.url} target="_blank" rel="noreferrer" className="text-sm text-[hsl(var(--primary))] hover:underline">
                  View on Etsy ↗
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {images.length > 0 && (
              <img src={images[0]["url_570xN"]} alt={product.title} className="w-full max-h-96 object-contain rounded-md" />
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}