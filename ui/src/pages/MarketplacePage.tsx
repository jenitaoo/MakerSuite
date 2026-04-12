import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProductTable from "../components/products/ProductTable";
import { getCookie } from "../../src/services/api.ts";
import { Product } from "../../src/types/product";
import {
  ShoppingBag,
  Store,
  TrendingUp,
  Package,
  PlusCircle,
  ClipboardList,
  MapPin,
  Calendar,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  LayoutGrid,
  ChevronDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LogSaleModal from "../components/products/LogSaleModal";
import { Star, Euro } from "lucide-react";
import Market_Bunny_Illustration from "../assets/misc/Market_Bunny_Illust.png";


// ─── Types ────────────────────────────────────────────────────────────────────

type ApiPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// Placeholder Market type — replace with real API type when backend is built
type Market = {
  id: number;
  name: string;
  date: string;
  location: string | null;
  notes: string | null;
  is_upcoming: boolean;
  total_revenue?: string;
  units_sold?: number;
  products_brought?: number;
};

// ─── Side nav config ──────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "at-a-glance", label: "At a Glance", icon: LayoutGrid },
  { id: "your-markets", label: "Markets", icon: Store },
  { id: "your-listings", label: "Listings", icon: Package },
] as const;

// ─── Placeholder market data (remove when API is wired) ───────────────────────

const DUMMY_UPCOMING: Market[] = [
  {
    id: 1,
    name: "Dublin Maker Market",
    date: "2026-04-19",
    location: "Dún Laoghaire Pier",
    notes: null,
    is_upcoming: true,
  },
];

const DUMMY_PAST: Market[] = [
  {
    id: 2,
    name: "Cork Craft Fair",
    date: "2026-03-22",
    location: "Cork City Hall",
    notes: "Very busy 12–2pm.",
    is_upcoming: false,
    total_revenue: "€45.00",
    units_sold: 5,
    products_brought: 4,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ___ Squiggle ______
function WavySeparator() {
  return (
    <div className="relative w-full overflow-visible my-2">
      <div
        className="wavy-line opacity-60 absolute left-1/2"
        style={{ width: "100vw", transform: "translateX(-50%)" }}
      />
      {/* spacer so the section flow isn't collapsed */}
      <div className="invisible wavy-line" />
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
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── MarketCard ───────────────────────────────────────────────────────────────

function MarketCard({ market }: { market: Market }) {
  const navigate = useNavigate();
  return (

    <div
      className="bg-white rounded-lg border border-border p-5 hover:border-[hsl(var(--primary))] transition-colors cursor-pointer group"
      onClick={() => navigate(`/marketplace/markets/${market.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground truncate group-hover:text-[hsl(var(--primary))] transition-colors">
            {market.name}
          </div>
          <div className="flex items-center gap-1 mt-1.5 text-sm text-muted-foreground">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>{formatDate(market.date)}</span>
          </div>
          {market.location && (
            <div className="flex items-center gap-1 mt-0.5 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{market.location}</span>
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-[hsl(var(--primary))] transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Past market stats */}
      {!market.is_upcoming && (
        <div className="mt-4 pt-4 border-t border-border flex gap-5 text-sm">
          {market.products_brought !== undefined && (
            <div>
              <div className="font-semibold text-foreground">{market.products_brought}</div>
              <div className="text-xs text-muted-foreground">products</div>
            </div>
          )}
          {market.units_sold !== undefined && (
            <div>
              <div className="font-semibold text-foreground">{market.units_sold}</div>
              <div className="text-xs text-muted-foreground">sold</div>
            </div>
          )}
          {market.total_revenue && (
            <div>
              <div className="font-semibold text-foreground">{market.total_revenue}</div>
              <div className="text-xs text-muted-foreground">revenue</div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming badge */}
      {market.is_upcoming && (
        <div className="mt-3">
          <Badge variant="outline" className="text-xs">
            Upcoming
          </Badge>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  const [logSaleOpen, setLogSaleOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("at-a-glance");

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // ── Fetch products ──────────────────────────────────────────────────────────

  const loadProducts = () => {
    setLoadingProducts(true);
    setProductError(null);
    fetch(`/api/product-list/?page_size=200`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-CSRFToken": getCookie("csrftoken") ?? "",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<ApiPage<Product>>;
      })
      .then((data) => setProducts(data.results || []))
      .catch((err) => {
        console.error("Failed to load products", err);
        setProductError("Failed to load products");
      })
      .finally(() => setLoadingProducts(false));
  };

  useEffect(() => { loadProducts(); }, []);

  // ── IntersectionObserver for anchor nav ─────────────────────────────────────

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Etsy sync ───────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setLoadingProducts(true);
    try {
      const shopRes = await fetch("/api/etsy/shop/", {
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
      });
      if (shopRes.status === 401 || shopRes.status === 403) {
        toast.error("Etsy session expired — reconnecting…", { duration: Infinity });
        window.location.href = `/api/etsy/login?return_to=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!shopRes.ok) { toast.error("Could not reach Etsy shop"); return; }
      const { shop_id } = await shopRes.json();
      await toast.promise(
        fetch(`/api/etsy/shops/${shop_id}/import/`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        }).then(async (res) => {
          if (!res.ok) throw new Error("Import failed");
          const data = await res.json();
          loadProducts();
          return data.imported_listing_ids?.length ?? 0;
        }),
        {
          loading: "Syncing from Etsy…",
          success: (count: number) => `Synced ${count} listings from Etsy`,
          error: "Failed to sync from Etsy",
        }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // ── Derived stats ───────────────────────────────────────────────────────────

  const outOfStock = products.filter((p) => p.internal_quantity === 0);
  const lowStock = products.filter((p) => p.internal_quantity > 0 && p.internal_quantity <= 3);
  const onEtsy = products.filter((p) => p.platforms?.includes("Etsy")).length;
  const onShopify = products.filter((p) => p.platforms?.includes("Shopify")).length;
  const notListed = products.filter((p) => !p.platforms || p.platforms.length === 1 && p.platforms[0] === "MakerSuite").length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex">

      {/* ── Sticky side anchor nav ── */}
    <nav className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 pl-2">
    {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = activeSection === id;
        return (
        <button
            key={id}
            onClick={() => scrollTo(id)}
            className={`group flex items-center gap-2 py-2 px-2 rounded-lg transition-all text-left
                hover:bg-[#C17B6F] ${active ? "bg-[#C17B6F]/40 text-white" : "text-white/40 hover:text-white"}`}
            >
            <div className={`w-1 h-6 rounded-full transition-all shrink-0 ${
            active ? "bg-white" : "bg-white/20 group-hover:bg-white/40"
            }`} />
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-xs font-medium whitespace-nowrap transition-all overflow-hidden max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100">
            {label}
            </span>
        </button>
        );
    })}
    </nav>


    {/* ── Main content ── */}
    <div className="flex-1 max-w-full pl-12 pr-4 sm:pr-6 lg:pr-10 pb-10 pt-0 space-y-0">
        {/* Page header */}
        <section
        id="intro"
        ref={(el) => { sectionRefs.current["intro"] = el; }}
        >
        {/* Scalloped box — flush to navbar top, gap on sides, stops before fold */}
        <div className="scalloped-intro bg-[#C17B6F] px-4 sm:px-8 lg:px-16 pt-6 sm:pt-12 pb-10 sm:pb-20 space-y-6 sm:space-y-10">

        {/* Hero row */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

        {/* Bunny — full width on mobile, 2/5 on desktop */}
        <div className="w-full lg:w-2/5 overflow-visible shrink-0 flex items-center justify-center">
        <img
            src={Market_Bunny_Illustration}
            alt="Illustration of a bunny in front of a market stall"
            className="w-1/2 lg:w-full max-h-40 sm:max-h-none object-contain lg:scale-125"
        />
        </div>
        {/* Right column — title + What's Here */}
        <div className="flex-1 space-y-8 sm:space-y-10">
            <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Marketplace</h1>
            <p className="mt-3 text-white/80 text-base leading-relaxed">
                Everything you need to sell your products — in person, online, or both.
            </p>
            </div>

             {/* Separator */}
            <div className="border-t border-white/20 w-full" />

            {/* What's Here — hidden on mobile */}
            <div className="hidden sm:block space-y-3 sm:space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white text-center">What's Here?</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
                {[
                    { icon: LayoutGrid, label: "At a Glance",   sub: "An overview of your products and how they're performing", id: "at-a-glance"  },
                    { icon: Store,      label: "Your Markets",  sub: "Prepare for and document in-person markets and sales",    id: "your-markets" },
                    { icon: Package,    label: "Your Listings", sub: "Manage your product listings — in person, online, or both", id: "your-listings" },
                ].map(({ icon: Icon, label, sub, id }) => (
                    <button
                    key={label}
                    onClick={() => scrollTo(id)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-xl p-3 sm:p-4 text-left transition-colors group w-full last:col-span-2 last:max-w-[calc(50%-0.25rem)] last:mx-auto sm:last:col-span-1 sm:last:max-w-none sm:last:mx-0"
                    >
                    <div className="rounded-lg bg-white/10 flex items-center justify-center mb-2 p-3">
                        <Icon className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                    <p className="text-xs text-white/60 mt-1">{sub}</p>
                    </button>
                ))}
                </div>
            </div>

            <div className="flex justify-center pt-2">
            <button
                onClick={() => scrollTo("at-a-glance")}
                className="flex flex-col items-center gap-1 text-white/50 hover:text-white/80 transition-colors animate-bounce"
            >
                <ChevronDown className="w-5 h-5" />
            </button>
            </div>
        </div>
        </div>

        </div>
        </section>


        {/* ═══ AT A GLANCE ═════════════════════════════════════════════════ */}
        <section
        id="at-a-glance"
        ref={(el) => { sectionRefs.current["at-a-glance"] = el; }}
        className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
        >

            <div>
              <h2 className="text-xl font-bold text-white">At A Glance</h2>
              <p className="text-white text-sm mt-0.5">
                An overview of your products and how they're performing
              </p>
            </div>
          {/* Out of stock alert */}
          {outOfStock.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800">
                  {outOfStock.length} product{outOfStock.length !== 1 ? "s" : ""} out of stock
                </p>
                <p className="text-xs text-red-700 mt-0.5 truncate">
                  {outOfStock.map((p) => p.title).join(", ")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 shrink-0"
                onClick={() => scrollTo("your-listings")}
              >
                View Listings
              </Button>
            </div>
          )}

          {/* Low stock alert */}
          {lowStock.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  {lowStock.length} product{lowStock.length !== 1 ? "s are" : " is"} running low on stock
                </p>
                <p className="text-xs text-amber-700 mt-0.5 truncate">
                  {lowStock.map((p) => p.title).join(", ")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
                onClick={() => scrollTo("your-listings")}
              >
                View Listings
              </Button>
            </div>
          )}

        {/* Stats + quick actions card */}
        <Card className="bg-[#fdf8f6]">
            <CardContent className="p-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pt-2">Quick Stats</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Products" value={products.length} icon={Package} />
                    <StatCard
                        label="Listed on Etsy"
                        value={onEtsy}
                        icon={Store}
                        sub={onEtsy === 0 ? "Not connected yet" : `${Math.round((onEtsy / products.length) * 100)}% of your products`}
                    />
                    <StatCard
                        label="Listed on Shopify"
                        value={onShopify}
                        icon={Store}
                        sub={onShopify === 0 ? "Not connected yet" : `${Math.round((onShopify / products.length) * 100)}% of your products`}
                    />
                    <StatCard
                        label="Not Listed Anywhere"
                        value={notListed}
                        icon={Package}
                        sub={notListed === 0 ? "All products are listed" : "Only visible in MakerSuite"}
                    />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Sales This Month" value="—" icon={TrendingUp} sub="Coming soon" />
                    <StatCard label="Revenue This Month" value="—" icon={ShoppingBag} sub="Coming soon" />
                    <StatCard label="Best Seller" value="—" icon={Star} sub="Coming soon" />
                    <StatCard label="Avg. Sale Value" value="—" icon={Euro} sub="Coming soon" />
                </div>



              <div className="flex flex-wrap gap-3 pt-1">
                <Button onClick={() => setLogSaleOpen(true)} className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Log a Sale
                </Button>
                <Button variant="outline" onClick={() => navigate("/products/new")} className="gap-2">
                  <PlusCircle className="w-4 h-4" />
                  New Product Listing
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <WavySeparator />


        {/* ═══ YOUR MARKETS ════════════════════════════════════════════════ */}
        <section
        id="your-markets"
        ref={(el) => { sectionRefs.current["your-markets"] = el; }}
        className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
        >
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Your Markets</h2>
              <p className="text-white text-sm mt-0.5">
                Prepare for in-person markets and log your sales.
              </p>
            </div>
            <Button
              onClick={() => toast("Market creation coming soon!", { icon: "🏪" })}
              className="gap-2 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              Add Market
            </Button>
          </div>

          <Card className="bg-[#fdf8f6]">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Upcoming
                </h3>
                {DUMMY_UPCOMING.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No upcoming markets. Add one above.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DUMMY_UPCOMING.map((m) => <MarketCard key={m.id} market={m} />)}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Past
                </h3>
                {DUMMY_PAST.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No past markets yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DUMMY_PAST.map((m) => <MarketCard key={m.id} market={m} />)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <WavySeparator />


        {/* ═══ YOUR PRODUCT LISTINGS ═══════════════════════════════════════ */}
        <section
        id="your-listings"
        ref={(el) => { sectionRefs.current["your-listings"] = el; }}
        className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
        >
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Your Product Listings</h2>
              <p className="text-white text-sm mt-0.5">
                View and manage your products across all sales channels.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loadingProducts}
              className="gap-2 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? "animate-spin" : ""}`} />
              Sync Etsy
            </Button>
          </div>

          <Card className="bg-[#fdf8f6]">
            <CardContent className="p-6">
              {loadingProducts ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading products…</p>
              ) : productError ? (
                <p className="text-sm text-destructive py-8 text-center">{productError}</p>
              ) : (
                <ProductTable
                  products={products}
                  onEdit={(p) => navigate(`/products/${p.id}/edit`)}
                  onRefresh={handleRefresh}
                  onCreateNew={() => navigate("/products/new")}
                  onDeleted={loadProducts}
                  onSaleLogged={loadProducts}
                />
              )}
            </CardContent>
          </Card>
        </section>

      </div>

      {/* ── Log Sale Modal ── */}
      {logSaleOpen && products.length > 0 && (
        <LogSaleModal
          product={products[0]}
          onClose={() => setLogSaleOpen(false)}
          onLogged={() => { setLogSaleOpen(false); loadProducts(); }}
        />
      )}
    </div>
  );
}