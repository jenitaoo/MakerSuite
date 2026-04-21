import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getCookie, API_URL } from "../../src/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ClipboardList,
  Plus,
  Search,
  Package,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { Product } from "../../src/types/product";

// Lazy load modals to speed up initial render
const LogSaleModal = lazy(() => import("../components/products/LogSaleModal"));

// ─── Types ────────────────────────────────────────────────────────────────────

type Market = {
  id: number;
  name: string;
  date: string;
  location: string | null;
  notes: string | null;
  is_upcoming: boolean;
  application_status: "not_applied" | "applied" | "accepted" | "rejected";
  market_products: MarketProduct[];
};

type MarketProduct = {
  id: number;
  product: number;
  product_title: string;
  units_brought: number;
};

type SaleLog = {
  id: number;
  product: number;
  units_sold: number;
  sale_price: string | null;
  sale_date: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_OPTIONS = [
  { value: "not_applied", label: "Not applied" },
  { value: "applied",     label: "Applied"     },
  { value: "accepted",    label: "Accepted"    },
  { value: "rejected",    label: "Rejected"    },
];

const STATUS_BADGE: Record<string, string> = {
  not_applied: "border-border text-muted-foreground",
  applied:     "border-blue-200 bg-blue-50 text-blue-700",
  accepted:    "border-green-200 bg-green-50 text-green-700",
  rejected:    "border-red-300 bg-red-100 text-red-600",
};

// ─── SectionHeader — white text headings above each card ─────────────────────

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-2">
      <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
      {subtitle && (
        <p className="text-white/80 text-sm mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-border p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-600 uppercase tracking-wide leading-tight">
          {label}
        </span>
        <Icon className="w-4 h-4 text-neutral-500" aria-hidden="true" />
      </div>
      <div className="text-3xl font-bold text-neutral-900">{value}</div>
      {sub && <div className="text-sm text-neutral-600">{sub}</div>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [market, setMarket] = useState<Market | null>(null);
  const [sales, setSales] = useState<SaleLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("not_applied");
  const [saving, setSaving] = useState(false);

  // Add product
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newUnitsBrought, setNewUnitsBrought] = useState(1);
  const [savingProduct, setSavingProduct] = useState(false);

  // Search + modal
  const [search, setSearch] = useState("");
  const [logSaleOpen, setLogSaleOpen] = useState(false);
  const [logSaleProductId, setLogSaleProductId] = useState<number | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const loadAll = async () => {
    try {
      const [mRes, sRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/markets/${id}/`, {
          credentials: "include",
          headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        }),
        fetch(`${API_URL}/api/markets/${id}/sales/`, {
          credentials: "include",
          headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        }),
        fetch(`${API_URL}/api/product-list/?page_size=200`, {
          credentials: "include",
          headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        }),
      ]);

      const marketData: Market = await mRes.json();
      const salesData = await sRes.json();
      const productData = await pRes.json();

      setMarket(marketData);
      setSales(salesData.results ?? salesData);
      setProducts(productData.results ?? productData);

      setEditName(marketData.name);
      setEditDate(marketData.date);
      setEditLocation(marketData.location ?? "");
      setEditNotes(marketData.notes ?? "");
      setEditStatus(marketData.application_status);
    } catch {
      toast.error("Failed to load market");
      navigate("/marketplace");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    loadAll();
  }, [id]);

  // ── Save details ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editName.trim()) { toast.error("Name is required"); return; }
    if (!editDate) { toast.error("Date is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/markets/${id}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: JSON.stringify({
          name: editName.trim(),
          date: editDate,
          location: editLocation.trim() || null,
          notes: editNotes.trim() || null,
          application_status: editStatus,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Market updated");
      setEditing(false);
      await loadAll();
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!market) return;
    setEditName(market.name);
    setEditDate(market.date);
    setEditLocation(market.location ?? "");
    setEditNotes(market.notes ?? "");
    setEditStatus(market.application_status);
    setEditing(false);
  };

  // ── Products brought ────────────────────────────────────────────────────────

  const handleAddProduct = async () => {
    if (!newProductId) { toast.error("Select a product"); return; }
    setSavingProduct(true);
    try {
      const res = await fetch(`${API_URL}/api/markets/${id}/products/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: JSON.stringify({ product: Number(newProductId), units_brought: newUnitsBrought }),
      });
      if (!res.ok) throw new Error();
      toast.success("Product added");
      setAddingProduct(false);
      setNewProductId("");
      setNewUnitsBrought(1);
      await loadAll();
    } catch {
      toast.error("Failed to add product");
    } finally {
      setSavingProduct(false);
    }
  };

  const handleRemoveProduct = async (productPk: number) => {
    try {
      const res = await fetch(`${API_URL}/api/markets/${id}/products/${productPk}/`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRFToken": getCookie("csrftoken") ?? "" },
      });
      if (!res.ok) throw new Error();
      toast.success("Product removed");
      await loadAll();
    } catch {
      toast.error("Failed to remove product");
    }
  };

  const handleUpdateUnits = async (productPk: number, units: number) => {
    try {
      const res = await fetch(`${API_URL}/api/markets/${id}/products/${productPk}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
        body: JSON.stringify({ units_brought: units }),
      });
      if (!res.ok) throw new Error();
      await loadAll();
    } catch {
      toast.error("Failed to update units");
    }
  };

  // ── Loading / empty ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-white text-sm">Loading market…</p>
      </div>
    );
  }
  if (!market) return null;

  // ── Derived ─────────────────────────────────────────────────────────────────

  const salesByProduct: Record<number, number> = {};
  sales.forEach((s) => {
    salesByProduct[s.product] = (salesByProduct[s.product] || 0) + (s.units_sold || 0);
  });

  const totalRevenue = sales.reduce((sum, s) => {
    return sum + (s.sale_price ? parseFloat(s.sale_price) : 0) * (s.units_sold || 1);
  }, 0);

  const totalUnitsSold = sales.reduce((sum, s) => sum + (s.units_sold || 0), 0);

  const filteredProducts = market.market_products.filter((mp) =>
    mp.product_title.toLowerCase().includes(search.toLowerCase())
  );

  const alreadyAddedIds = new Set(market.market_products.map((mp) => mp.product));
  const availableProducts = products.filter((p) => !alreadyAddedIds.has(p.id));

  const outOfStockProducts = market.market_products.filter((mp) => {
    const sold = salesByProduct[mp.product] || 0;
    return sold >= mp.units_brought && mp.units_brought > 0;
  });

  const logSaleProduct = logSaleProductId
    ? products.find((p) => p.id === logSaleProductId) ?? null
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ── Back ── */}
      <button
        aria-label="Back to Marketplace"
        onClick={() => navigate("/marketplace")}
        className="text-white hover:text-white text-sm flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Marketplace
      </button>

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{market.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="flex items-center gap-1 text-white text-sm">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(market.date)}
            </span>
            {market.location && (
              <span className="flex items-center gap-1 text-white text-sm">
                <MapPin className="w-3.5 h-3.5" />
                {market.location}
              </span>
            )}
            <Badge variant="outline" className={STATUS_BADGE[market.application_status]}>
              {STATUS_OPTIONS.find((s) => s.value === market.application_status)?.label}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {editing ? (
            <>
              <Button aria-label="Save market changes" size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button aria-label="Cancel market edit" size="sm" variant="outline" onClick={handleCancelEdit} disabled={saving} className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20">
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              aria-label={`Edit market: ${market.name}`}
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* ── Edit form ── */}
      {editing && (
        <div className="space-y-2">
          <SectionHeader
            title="Edit Market"
            subtitle="Update the details for this market."
          />
          <Card className="bg-[#fdf8f6] border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Market Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Location <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input placeholder="e.g. Dún Laoghaire Pier" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Application Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger aria-label="Market application status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Sold out alert ── */}
      {outOfStockProducts.length > 0 && (
        <div
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 flex items-start gap-3"
          role="alert"
        >
          <AlertTriangle className="h-4 w-4 text-red-700 mt-0.5 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-700">
              {outOfStockProducts.length} product{outOfStockProducts.length !== 1 ? "s" : ""} sold out at this market
            </p>
            <p className="text-sm text-red-700 mt-0.5 truncate">
              {outOfStockProducts.map((mp) => mp.product_title).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ── At a Glance ── */}
      <div className="space-y-2">
        <SectionHeader
          title="At a Glance"
          subtitle="Your sales and revenue for this market."
        />
        <Card className="bg-white border-neutral-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard
                label="Products Brought"
                value={market.market_products.length}
                icon={Package}
                sub={market.market_products.length === 0 ? "None added yet" : undefined}
              />
              <StatCard
                label="Units Sold"
                value={totalUnitsSold || "—"}
                icon={ShoppingBag}
                sub={totalUnitsSold === 0 ? "No sales logged yet" : undefined}
              />
              <StatCard
                label="Revenue"
                value={totalRevenue > 0 ? `€${totalRevenue.toFixed(2)}` : "—"}
                icon={TrendingUp}
                sub={totalRevenue === 0 ? "No sales logged yet" : undefined}
              />
            </div>
            {/* Quick actions */}
            <div className="grid grid-cols-1 gap-3 pt-1 px-4 pt-4">
                <Button
                aria-label="Log a sale for this market"
                onClick={() => { setLogSaleProductId(null); setLogSaleOpen(true); }}
                className="gap-2 h-10 w-full justify-center"
                disabled={products.length === 0}
                >
                <ClipboardList className="w-4 h-4" aria-hidden="true" />
                Log a Sale
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Products Brought & Sold ── */}
      <div className="space-y-2">
        <SectionHeader
          title="Products Brought & Sold"
          subtitle="Track what you brought to this market and how much you sold."
        />
        <Card className="bg-white border-neutral-200">
          <CardContent className="p-6 space-y-4">

            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search products…"
                  className="pl-8 h-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button
                aria-label="Add a product to this market"
                size="sm"
                variant="outline"
                className="gap-1.5 h-8 shrink-0"
                onClick={() => setAddingProduct(true)}
                disabled={availableProducts.length === 0 || addingProduct}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Product
              </Button>
            </div>

            {/* Add product row — matches table styling */}
            {addingProduct && (
              <div className="rounded-md border border-border overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 flex items-center gap-2">
                  <div className="w-14" />
                  <select
                    value={newProductId}
                    onChange={(e) => setNewProductId(e.target.value)}
                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select a product…</option>
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}{p.internal_quantity != null ? ` (${p.internal_quantity} in stock)` : ""}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={newUnitsBrought}
                    onChange={(e) => setNewUnitsBrought(Number(e.target.value))}
                    className="w-16 h-8 text-sm text-center"
                    placeholder="Qty"
                  />
                  <div className="flex items-center gap-1">
                    <Button aria-label="Add product" size="sm" onClick={handleAddProduct} disabled={savingProduct} className="h-8 gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Add
                    </Button>
                    <Button
                      aria-label="Cancel adding product"
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => { setAddingProduct(false); setNewProductId(""); setNewUnitsBrought(1); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 p-2">
                      <span className="text-xs font-semibold uppercase tracking-wide">Photo</span>
                    </TableHead>
                    <TableHead className="p-2">
                      <span className="text-xs font-semibold uppercase tracking-wide">Name</span>
                    </TableHead>
                    <TableHead className="p-2 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wide">Brought</span>
                    </TableHead>
                    <TableHead className="p-2 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wide">Sold</span>
                    </TableHead>
                    <TableHead className="p-2 text-center">
                      <span className="text-xs font-semibold uppercase tracking-wide">Remaining</span>
                    </TableHead>
                    <TableHead className="p-2 text-right">
                      <span className="text-xs font-semibold uppercase tracking-wide">Price</span>
                    </TableHead>
                    <TableHead className="p-2 w-24">
                      <span className="text-xs font-semibold uppercase tracking-wide">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                        {market.market_products.length === 0
                          ? "No products added yet. Use \"Add Product\" above."
                          : "No products match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((mp) => {
                      const product = products.find((p) => p.id === mp.product);
                      const sold = salesByProduct[mp.product] || 0;
                      const remaining = mp.units_brought - sold;
                      const soldOut = remaining <= 0 && mp.units_brought > 0;

                      return (
                        <TableRow key={mp.id}>
                          <TableCell className="p-2 w-14">
                            <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                              {product?.image_url ? (
                                <img src={product.image_url} alt={mp.product_title} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="p-2">
                            <p className="text-sm font-medium truncate max-w-[20ch]">{mp.product_title}</p>
                            {product?.sku && <p className="text-xs text-muted-foreground">{product.sku}</p>}
                          </TableCell>
                          <TableCell className="p-2 text-center">
                            <Input
                              type="number"
                              min={0}
                              max={999}
                              value={mp.units_brought}
                              onChange={(e) => {
                                const val = e.target.value;
                                // Allow empty string while typing
                                if (val === "") {
                                  // Don't update yet, let user finish typing
                                  return;
                                }
                                const num = Number(val);
                                if (!isNaN(num) && num >= 0) {
                                  handleUpdateUnits(mp.product, num);
                                }
                              }}
                              onBlur={(e) => {
                                // On blur, if empty, set to 1
                                if (e.target.value === "") {
                                  handleUpdateUnits(mp.product, 1);
                                }
                              }}
                              className="w-16 h-7 text-sm text-center px-1 mx-auto"
                            />
                          </TableCell>
                          <TableCell className="p-2 text-center text-sm">{sold}</TableCell>
                          <TableCell className="p-2 text-center">
                            {soldOut ? (
                              <Badge variant="outline" className="text-red-600 border-red-300 bg-red-100 text-xs">
                                Sold out
                              </Badge>
                            ) : (
                              <span className="text-sm">{remaining}</span>
                            )}
                          </TableCell>
                          <TableCell className="p-2 text-right text-sm">
                            {product?.internal_price ? `€${product.internal_price}` : "—"}
                          </TableCell>
                          <TableCell className="p-2">
                            <div className="flex items-center gap-1">
                              <Button
                                aria-label={`Log a sale for ${mp.product_title}`}
                                size="sm"
                                className="h-7 text-xs px-2 gap-1"
                                onClick={() => { setLogSaleProductId(mp.product); setLogSaleOpen(true); }}
                                disabled={sold >= mp.units_brought}
                                title={sold >= mp.units_brought ? "All units sold" : undefined}
                              >
                                <ClipboardList className="w-3 h-3" />
                                Log
                              </Button>
                              <Button
                                aria-label="Remove Product"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRemoveProduct(mp.product)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}

                  {filteredProducts.length > 0 && (
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell className="p-2" />
                      <TableCell className="p-2 text-xs uppercase tracking-wide text-muted-foreground">Total</TableCell>
                      <TableCell className="p-2" />
                      <TableCell className="p-2 text-center text-sm">{totalUnitsSold}</TableCell>
                      <TableCell className="p-2" />
                      <TableCell className="p-2 text-right text-sm">
                        {totalRevenue > 0 ? `€${totalRevenue.toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="p-2" />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* ── Notes ── */}
      {market.notes && !editing && (
        <div className="space-y-2">
          <SectionHeader title="Notes" />
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {market.notes}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Log sale modal ── */}
      {logSaleOpen && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <LogSaleModal
            products={logSaleProduct ? undefined : products}
            product={logSaleProduct ?? undefined}
            marketId={market.id}
            marketName={market.name}
            onClose={() => { setLogSaleOpen(false); setLogSaleProductId(null); }}
            onLogged={() => { setLogSaleOpen(false); setLogSaleProductId(null); loadAll(); }}
          />
        </Suspense>
      )}

    </div>
  );
}