import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCookie } from "../../services/api";
import { getTags, createTag } from "../../services/inventoryApi";
import { Product } from "../../types/product";
import { SaleTag } from "../../types/inventory";
import {
  Search,
  ChevronLeft,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type Props = {
  product?: Product;      // pre-selected — ProductTable context, skips picker
  products?: Product[];   // full list — market context, shows picker
  onClose: () => void;
  onLogged: () => void;
  marketId?: number;
  marketName?: string;
};

// ─── Step 1: Product table picker ────────────────────────────────────────────

type SortField = "title" | "internal_price" | "internal_quantity";
type SortDir = "asc" | "desc";

function ProductTablePicker({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (p: Product) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 opacity-40 inline ml-1" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const base = q
      ? products.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.sku ?? "").toLowerCase().includes(q)
        )
      : products;

    return [...base].sort((a, b) => {
      let av: any = a[sortField] ?? "";
      let bv: any = b[sortField] ?? "";
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [products, search, sortField, sortDir]);

  const outOfStockCount = products.filter(
    (p) => (p.internal_quantity ?? 0) === 0
  ).length;

  return (
    <div className="space-y-3">
      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        Please select a product you'd like to log a sale for.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
          autoFocus
        />
      </div>
      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 p-2">
                <span className="text-xs font-semibold uppercase tracking-wide">Photo</span>
              </TableHead>
              <TableHead className="p-2">
                <button
                  className="flex items-center text-xs font-semibold uppercase tracking-wide hover:text-foreground"
                  onClick={() => toggleSort("title")}
                >
                  Name
                  <SortIcon field="title" />
                </button>
              </TableHead>
              <TableHead className="p-2 w-24">
                <span className="text-xs font-semibold uppercase tracking-wide">SKU</span>
              </TableHead>
              <TableHead className="p-2 text-right">
                <button
                  className="flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide hover:text-foreground ml-auto"
                  onClick={() => toggleSort("internal_price")}
                >
                  Price
                  <SortIcon field="internal_price" />
                </button>
              </TableHead>
              <TableHead className="p-2 text-right">
                <button
                  className="flex items-center gap-0.5 text-xs font-semibold uppercase tracking-wide hover:text-foreground ml-auto"
                  onClick={() => toggleSort("internal_quantity")}
                >
                  Stock
                  <SortIcon field="internal_quantity" />
                </button>
              </TableHead>
              <TableHead className="p-2 w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-sm text-muted-foreground"
                >
                  {search ? "No products match your search." : "No products available."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => {
                const qty = p.internal_quantity ?? 0;
                const disabled = qty === 0;
                return (
                  <TableRow
                    key={p.id}
                    className={
                      disabled
                        ? "opacity-40"
                        : "cursor-pointer hover:bg-muted/50"
                    }
                    onClick={() => !disabled && onSelect(p)}
                  >
                    {/* Thumbnail */}
                    <TableCell className="p-2 w-14">
                      <div className="w-9 h-9 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>

                    {/* Name */}
                    <TableCell className="p-2">
                      <p className="text-sm font-medium truncate max-w-[16ch]">
                        {p.title}
                      </p>
                    </TableCell>

                    {/* SKU */}
                    <TableCell className="p-2 w-24">
                      <span className="text-xs text-muted-foreground">{p.sku ?? "—"}</span>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="p-2 text-right text-sm">
                      {p.internal_price ? `€${p.internal_price}` : "—"}
                    </TableCell>

                    {/* Stock */}
                    <TableCell className="p-2 text-right">
                      {qty === 0 ? (
                        <Badge
                          variant="outline"
                          className="text-red-600 border-red-200 bg-red-50 text-xs"
                        >
                          Out of stock
                        </Badge>
                      ) : qty <= 3 ? (
                        <Badge
                          variant="outline"
                          className="text-amber-600 border-amber-200 bg-amber-50 text-xs"
                        >
                          {qty} left
                        </Badge>
                      ) : (
                        <span className="text-sm">{qty}</span>
                      )}
                    </TableCell>

                    {/* Select button */}
                    <TableCell className="p-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3"
                        disabled={disabled}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(p);
                        }}
                      >
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {outOfStockCount > 0 && !search && (
        <p className="text-xs text-muted-foreground text-center">
          {outOfStockCount} product{outOfStockCount !== 1 ? "s are" : " is"} out
          of stock and cannot be selected.
        </p>
      )}
    </div>
  );
}

// ─── Step 2: Sale details ─────────────────────────────────────────────────────

function SaleDetailsForm({
  product,
  marketId,
  marketName,
  onLogged,
  onBack,
  onClose,
}: {
  product: Product;
  marketId?: number;
  marketName?: string;
  onLogged: () => void;
  onBack?: () => void;
  onClose: () => void;
}) {
  const [unitsSold, setUnitsSold] = useState(1);
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<SaleTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [saving, setSaving] = useState(false);
  const [unitPrices, setUnitPrices] = useState<string[]>([
    product.internal_price ?? "",
  ]);

  const defaultPrice = product.internal_price ?? "";
  const inStock = product.internal_quantity ?? 0;

  useEffect(() => {
    getTags()
      .then((data) => setTags(data.results ?? data))
      .catch(() => {});
  }, []);

  const handleUnitsSoldChange = (val: number) => {
    const clamped = Math.max(1, Math.min(val, inStock));
    setUnitsSold(clamped);
    setUnitPrices((prev) =>
      Array(clamped)
        .fill("")
        .map((_, i) => prev[i] ?? defaultPrice)
    );
  };

  const handleUnitPriceChange = (index: number, value: string) => {
    setUnitPrices((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const totalSaleValue = unitPrices.reduce((sum, p) => {
    const parsed = parseFloat(p);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const tag = await createTag(newTagName.trim());
      setTags((prev) => [...prev, tag]);
      setSelectedTagIds((prev) => [...prev, tag.id]);
      setNewTagName("");
    } catch {
      toast.error("Failed to create tag");
    }
  };

  const toggleTag = (id: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (unitsSold > inStock) {
      toast.error(`Only ${inStock} in stock`);
      return;
    }
    setSaving(true);
    try {
      const unit_prices = unitPrices.map((p, i) => ({
        unit: i + 1,
        price: p || defaultPrice || "0",
      }));

      const payload = {
        units_sold: unitsSold,
        sale_date: saleDate,
        tag_ids: selectedTagIds,
        source: "manual",
        unit_prices,
        sale_price: totalSaleValue.toFixed(2),
        notes: notes || undefined,
        ...(marketId ? { product: product.id } : {}),
      };

      const url = marketId
        ? `/api/markets/${marketId}/sales/`
        : `/api/products/${product.id}/log-sale/`;

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to log sale");
        return;
      }

      toast.success(
        marketId && marketName
          ? `Sale logged for ${marketName}`
          : "Sale logged"
      );
      onLogged();
    } catch {
      toast.error("Failed to log sale");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Selected product summary */}
      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border mb-4">
        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Package className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {product.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {product.internal_price ? `€${product.internal_price}` : "No price"}{" "}
            · {inStock} in stock
          </p>
        </div>
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground shrink-0"
            onClick={onBack}
          >
            Change
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Units Sold</Label>
          <Input
            type="number"
            min={1}
            max={inStock}
            value={unitsSold}
            onChange={(e) => handleUnitsSoldChange(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
          />
          <p className="text-xs text-muted-foreground">{inStock} in stock</p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Price per Unit (€)</Label>
            {defaultPrice && (
              <span className="text-xs text-muted-foreground">
                Default: €{defaultPrice}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {unitPrices.map((price, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-12 shrink-0">
                  Unit {i + 1}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={defaultPrice || "0.00"}
                  value={price}
                  onChange={(e) => handleUnitPriceChange(i, e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-sm font-medium">Total</span>
            <span className="text-sm font-medium">
              €{totalSaleValue.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                    selectedTagIds.includes(tag.id)
                      ? "bg-[hsl(var(--primary))] text-white border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name..."
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              className="flex-1"
            />
            <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
              + Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Click a tag to select it. Press Enter or + Add to create a new one.
          </p>
        </div>

        <div className="space-y-2">
          <Label>
            Notes{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Logging..." : "Log Sale"}
        </Button>
      </DialogFooter>
    </>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

export default function LogSaleModal({
  product: preselectedProduct,
  products,
  onClose,
  onLogged,
  marketId,
  marketName,
}: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    preselectedProduct ?? null
  );

  const showPicker = !selectedProduct && !!products;

  const title = showPicker
    ? `Log Sale${marketName ? ` — ${marketName}` : ""}`
    : selectedProduct
    ? `Log Sale — ${selectedProduct.title}`
    : "Log Sale";

  const subtitle =
    !showPicker && marketName && selectedProduct ? `at ${marketName}` : undefined;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={`bg-[#fdf8f6] ${showPicker ? "max-w-2xl" : "max-w-sm"}`}
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            {!showPicker && products && selectedProduct && (
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label="Back to product selection"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <DialogTitle>{title}</DialogTitle>
              {subtitle && (
                <p className="text-sm font-normal text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Progress bar — two-step flow only */}
          {products && (
            <div className="flex items-center gap-1.5 pt-1">
              <div className="h-1 flex-1 rounded-full bg-[hsl(var(--primary))]" />
              <div
                className={`h-1 flex-1 rounded-full transition-colors ${
                  !showPicker ? "bg-[hsl(var(--primary))]" : "bg-muted"
                }`}
              />
            </div>
          )}
        </DialogHeader>

        <div className="py-2">
          {showPicker ? (
            <ProductTablePicker
              products={products!}
              onSelect={(p) => setSelectedProduct(p)}
            />
          ) : selectedProduct ? (
            <SaleDetailsForm
              product={selectedProduct}
              marketId={marketId}
              marketName={marketName}
              onLogged={onLogged}
              onBack={products ? () => setSelectedProduct(null) : undefined}
              onClose={onClose}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}