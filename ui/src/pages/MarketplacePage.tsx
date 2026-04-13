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
  LayoutGrid,
  ChevronDown,
  Search,
  Trash2
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LogSaleModal from "../components/products/LogSaleModal";
import { Star, Euro } from "lucide-react";
import Market_Bunny_Illustration from "../assets/misc/Market_Bunny_Illust.png";
import AddMarketModal from "../components/products/AddMarketModal";
import DeleteMarketModal from "../components/products/DeleteMarketModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApiPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

type Market = {
  id: number;
  name: string;
  date: string;
  location: string | null;
  notes: string | null;
  is_upcoming: boolean;
  application_status: "not_applied" | "applied" | "accepted" | "rejected";
  total_revenue?: string;
  units_sold?: number;
  products_brought?: number;
};

// ─── Side nav config ──────────────────────────────────────────────────────────

const NAV_SECTIONS = [
  { id: "at-a-glance",   label: "At a Glance", icon: LayoutGrid },
  { id: "your-markets",  label: "Markets",      icon: Store      },
  { id: "your-products", label: "Products",     icon: Package    },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── WavySeparator ────────────────────────────────────────────────────────────

function WavySeparator() {
  return (
    <div className="relative w-full overflow-x-hidden my-2" aria-hidden="true">
      <div
        className="wavy-line opacity-60 absolute left-1/2"
        style={{ width: "100vw", transform: "translateX(-50%)" }}
      />
      <div className="wavy-line invisible" />
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

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  not_applied: {
    label: "Not applied",
    className: "border-border text-muted-foreground",
  },
  applied: {
    label: "Applied",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  accepted: {
    label: "Accepted",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  rejected: {
    label: "Rejected",
    className: "border-red-200 bg-red-50 text-red-600",
  },
};

// ─── MarketCard ───────────────────────────────────────────────────────────────

function MarketCard({
  market,
  onLogSale,
  onDelete,
}: {
  market: Market;
  onLogSale: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const badge =
    STATUS_BADGE[market.application_status] ?? STATUS_BADGE.not_applied;

  return (
    <Card className="flex flex-col hover:border-[hsl(var(--primary))] transition-colors group">
      <CardContent className="p-4 flex flex-col flex-1 gap-0">

        {/* Clickable header → market detail */}
        <div
          className="flex items-start justify-between gap-2 cursor-pointer"
          onClick={() => navigate(`/marketplace/markets/${market.id}`)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) =>
            e.key === "Enter" && navigate(`/marketplace/markets/${market.id}`)
          }
          aria-label={`View market: ${market.name}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-card-foreground truncate group-hover:text-[hsl(var(--primary))] transition-colors">
              {market.name}
            </p>
            <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>{formatDate(market.date)}</span>
            </div>
            {market.location && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{market.location}</span>
              </div>
            )}
          </div>
          <ChevronRight
            className="w-4 h-4 text-muted-foreground group-hover:text-[hsl(var(--primary))] transition-colors shrink-0 mt-0.5"
            aria-hidden="true"
          />
        </div>

        {/* Application status badge — upcoming markets */}
        {market.is_upcoming && (
          <div className="mt-3">
            <Badge variant="outline" className={badge.className}>
              {badge.label}
            </Badge>
          </div>
        )}

        {/* Stats row — past markets */}
        {!market.is_upcoming &&
          (market.products_brought != null ||
            market.units_sold != null ||
            market.total_revenue) && (
            <div className="mt-3 pt-3 border-t border-border flex gap-4">
              {market.products_brought != null && (
                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    {market.products_brought}
                  </p>
                  <p className="text-xs text-muted-foreground">products</p>
                </div>
              )}
              {market.units_sold != null && (
                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    {market.units_sold}
                  </p>
                  <p className="text-xs text-muted-foreground">sold</p>
                </div>
              )}
              {market.total_revenue && (
                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    {market.total_revenue}
                  </p>
                  <p className="text-xs text-muted-foreground">revenue</p>
                </div>
              )}
            </div>
          )}

        {/* Log a sale + Delete — pushed to bottom of card */}
        <div className="mt-auto pt-3 flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onLogSale();
            }}
          >
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
            Log a sale
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete market"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const navigate = useNavigate();

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Markets
  const [upcoming, setUpcoming] = useState<Market[]>([]);
  const [past, setPast] = useState<Market[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [marketSearch, setMarketSearch] = useState("");
  const [marketStatusFilter, setMarketStatusFilter] = useState<string | undefined>(undefined);
  const [marketTimeFilter, setMarketTimeFilter] = useState<string | undefined>(undefined);
  const [deleteMarket, setDeleteMarket] = useState<Market | null>(null);

  // Modals
  const [logSaleOpen, setLogSaleOpen] = useState(false);
  const [logSaleMarket, setLogSaleMarket] = useState<Market | null>(null);
  const [addMarketOpen, setAddMarketOpen] = useState(false);

  // Nav
  const [activeSection, setActiveSection] = useState<string>("at-a-glance");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // ── Data fetching ───────────────────────────────────────────────────────────

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

  const loadMarkets = () => {
    setLoadingMarkets(true);
    fetch("/api/markets/", {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-CSRFToken": getCookie("csrftoken") ?? "",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data) => {
        const results: Market[] = data.results ?? data;
        setUpcoming(results.filter((m) => m.is_upcoming));
        setPast(results.filter((m) => !m.is_upcoming));
      })
      .catch((err) => console.error("Failed to load markets", err))
      .finally(() => setLoadingMarkets(false));
  };

  useEffect(() => {
    loadProducts();
    loadMarkets();
  }, []);

  // ── Intersection observer for side nav ──────────────────────────────────────

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV_SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
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
        headers: {
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
      });
      if (shopRes.status === 401 || shopRes.status === 403) {
        toast(
        (t) => (
            <div className="space-y-2">
            <p className="text-sm font-medium">Connect to Etsy?</p>
            <p className="text-xs text-muted-foreground">
                It looks like you aren't connected to Etsy or your session has expired!
            </p>
            <div className="flex gap-2 pt-1">
                <button
                onClick={() => {
                    toast.dismiss(t.id);
                    window.location.href = `/api/etsy/login?return_to=${encodeURIComponent(
                    window.location.pathname
                    )}`;
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-[hsl(var(--primary))] text-white hover:opacity-90"
                >
                Redirect and Connect
                </button>
                <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted"
                >
                Cancel
                </button>
            </div>
            </div>
        ),
        { duration: Infinity }
        );
        return;
      }
      if (!shopRes.ok) {
        toast.error("Could not reach Etsy shop");
        return;
      }
      const { shop_id } = await shopRes.json();
      await toast.promise(
        fetch(`/api/etsy/shops/${shop_id}/import/`, {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-CSRFToken": getCookie("csrftoken") ?? "",
          },
        }).then(async (res) => {
          if (!res.ok) throw new Error("Import failed");
          const data = await res.json();
          loadProducts();
          return data.imported_listing_ids?.length ?? 0;
        }),
        {
          loading: "Syncing from Etsy…",
          success: (count: number) => `Synced ${count} products from Etsy`,
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
  const lowStock = products.filter(
    (p) => p.internal_quantity > 0 && p.internal_quantity <= 3
  );
  const onEtsy = products.filter((p) => p.platforms?.includes("Etsy")).length;
  const onShopify = products.filter((p) => p.platforms?.includes("Shopify")).length;
  const notListed = products.filter(
    (p) =>
      !p.platforms ||
      (p.platforms.length === 1 && p.platforms[0] === "MakerSuite")
  ).length;

  // ── Market filters ──────────────────────────────────────────────────────────

 const filterMarket = (m: Market) => {
  const q = marketSearch.toLowerCase();
  if (q && !m.name.toLowerCase().includes(q) &&
      !(m.location ?? "").toLowerCase().includes(q)) return false;
  if (marketStatusFilter && marketStatusFilter !== "all" && 
      m.application_status !== marketStatusFilter) return false;
  return true;
};

  const filteredUpcoming = upcoming.filter(filterMarket);
  const filteredPast = past.filter(filterMarket);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex overflow-x-hidden">

      {/* ── Side nav ── */}
      <nav
        aria-label="Page sections"
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 pl-2"
      >
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              aria-label={`Navigate to ${label}`}
              aria-current={active ? "location" : undefined}
              className={`group flex items-center gap-2 py-2 px-2 rounded-lg transition-all text-left
                hover:bg-[#C17B6F] ${
                  active
                    ? "bg-[#C17B6F]/40 text-white"
                    : "text-white/40 hover:text-white"
                }`}
            >
              <div
                className={`w-1 h-6 rounded-full transition-all shrink-0 ${
                  active
                    ? "bg-white"
                    : "bg-white/20 group-hover:bg-white/40"
                }`}
              />
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium whitespace-nowrap transition-all overflow-hidden max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Main content ── */}
      <div className="flex-1 max-w-full pl-12 pr-4 sm:pr-6 lg:pr-10 pb-10 pt-0 space-y-0">

        {/* ═══ INTRO ═══════════════════════════════════════════════════════ */}
        <section
          id="intro"
          ref={(el) => { sectionRefs.current["intro"] = el; }}
          aria-label="Marketplace overview"
        >
          <div className="scalloped-intro bg-[#C17B6F] px-4 sm:px-8 lg:px-16 pt-6 sm:pt-12 pb-10 sm:pb-20 space-y-6 sm:space-y-10">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

              <div className="w-full lg:w-2/5 overflow-visible shrink-0 flex items-center justify-center">
                <img
                  src={Market_Bunny_Illustration}
                  alt="Illustration of a bunny in front of a craft market stall"
                  className="w-1/2 lg:w-full max-h-40 sm:max-h-none object-contain lg:scale-125"
                />
              </div>

              <div className="flex-1 space-y-6 sm:space-y-8">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">
                    Marketplace
                  </h1>
                  <p className="mt-3 text-white/90 text-base leading-relaxed">
                    Everything you need to sell your products — in person, online, or both.
                  </p>
                </div>

                <div className="border-t border-white/30 w-full" />

                {/* What's Here — hidden on mobile */}
                <div className="hidden sm:block space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white text-center">
                    What's Here?
                  </h2>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
                    {[
                      {
                        icon: LayoutGrid,
                        label: "At a Glance",
                        sub: "Stock alerts, sales stats and quick actions",
                        id: "at-a-glance",
                      },
                      {
                        icon: Store,
                        label: "Your Markets",
                        sub: "Plan markets, track applications and log in-person sales",
                        id: "your-markets",
                      },
                      {
                        icon: Package,
                        label: "Your Products",
                        sub: "All your products — Etsy, Shopify or MakerSuite only",
                        id: "your-products",
                      },
                    ].map(({ icon: Icon, label, sub, id }) => (
                      <button
                        key={label}
                        onClick={() => scrollTo(id)}
                        aria-label={`Go to ${label}`}
                        className="bg-white/15 hover:bg-white/25 border border-white/30 hover:border-white/50 rounded-xl p-3 sm:p-4 text-left transition-colors group w-full"
                      >
                        <div className="rounded-lg bg-white/15 flex items-center justify-center mb-2 p-3">
                          <Icon
                            className="w-4 h-4 text-white/80 group-hover:text-white transition-colors"
                            aria-hidden="true"
                          />
                        </div>
                        <p className="text-sm font-semibold text-white leading-tight">
                          {label}
                        </p>
                        <p className="text-sm text-white/80 mt-1 leading-snug">
                          {sub}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => scrollTo("at-a-glance")}
                    aria-label="Scroll to At a Glance section"
                    className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors animate-bounce"
                  >
                    <ChevronDown className="w-5 h-5" aria-hidden="true" />
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
          aria-label="At a Glance"
        >
          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              At a Glance
            </h2>
            <p className="text-white/90 text-sm sm:text-base mt-1 leading-relaxed">
              Your products and sales performance. Low stock alerts and quick actions are below.
            </p>
          </div>

          {outOfStock.length > 0 && (
            <div
              className="rounded-md border border-red-300 bg-red-50 px-4 py-3 flex items-start gap-3"
              role="alert"
            >
              <AlertTriangle
                className="h-4 w-4 text-red-700 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">
                  {outOfStock.length} product
                  {outOfStock.length !== 1 ? "s" : ""} out of stock
                </p>
                <p className="text-sm text-red-700 mt-0.5 truncate">
                  {outOfStock.map((p) => p.title).join(", ")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-400 text-red-700 hover:bg-red-100 shrink-0 font-semibold"
                onClick={() => scrollTo("your-products")}
              >
                View Products
              </Button>
            </div>
          )}

          {lowStock.length > 0 && (
            <div
              className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3"
              role="alert"
            >
              <AlertTriangle
                className="h-4 w-4 text-amber-700 mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-700">
                  {lowStock.length} product
                  {lowStock.length !== 1 ? "s are" : " is"} running low on
                  stock
                </p>
                <p className="text-sm text-amber-700 mt-0.5 truncate">
                  {lowStock.map((p) => p.title).join(", ")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0 font-semibold"
                onClick={() => scrollTo("your-products")}
              >
                View Products
              </Button>
            </div>
          )}

          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-neutral-700 pt-1">
                Quick Stats
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Total Products"
                  value={products.length}
                  icon={Package}
                />
                <StatCard
                  label="Listed on Etsy"
                  value={onEtsy}
                  icon={Store}
                  sub={
                    onEtsy === 0
                      ? "Not connected yet"
                      : `${Math.round((onEtsy / products.length) * 100)}% of your products`
                  }
                />
                <StatCard
                  label="Listed on Shopify"
                  value={onShopify}
                  icon={Store}
                  sub={
                    onShopify === 0
                      ? "Not connected yet"
                      : `${Math.round((onShopify / products.length) * 100)}% of your products`
                  }
                />
                <StatCard
                  label="Not Listed Anywhere"
                  value={notListed}
                  icon={Package}
                  sub={
                    notListed === 0
                      ? "All products are listed"
                      : "Only visible in MakerSuite"
                  }
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Sales This Month"
                  value="—"
                  icon={TrendingUp}
                  sub="Coming soon"
                />
                <StatCard
                  label="Revenue This Month"
                  value="—"
                  icon={ShoppingBag}
                  sub="Coming soon"
                />
                <StatCard
                  label="Best Seller"
                  value="—"
                  icon={Star}
                  sub="Coming soon"
                />
                <StatCard
                  label="Avg. Sale Value"
                  value="—"
                  icon={Euro}
                  sub="Coming soon"
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  onClick={() => setLogSaleOpen(true)}
                  className="gap-2"
                >
                  <ClipboardList className="w-4 h-4" aria-hidden="true" />
                  Log a Sale
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/products/new")}
                  className="gap-2"
                >
                  <PlusCircle className="w-4 h-4" aria-hidden="true" />
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
          aria-label="Your Markets"
        >
          <div className="flex items-end justify-between gap-4">
            <div className="mb-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Your Markets</h2>
                <p className="text-white/90 text-sm sm:text-base mt-1 leading-relaxed">
                    Plan and track in-person craft markets — from application to final sales.
                </p>
            </div>
          </div>

          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-4">

                {/* Toolbar */}
                <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-[140px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                    placeholder="Search markets…"
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                    />
                </div>

                <Select value={marketStatusFilter} onValueChange={setMarketStatusFilter}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="not_applied">Not applied</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={marketTimeFilter} onValueChange={setMarketTimeFilter}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                    <SelectValue placeholder="All markets" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All markets</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    </SelectContent>
                </Select>

                <div className="ml-auto">
                    <Button
                    onClick={() => setAddMarketOpen(true)}
                    className="gap-2 h-8 text-sm"
                    >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add Market
                    </Button>
                </div>
            </div>

              {/* Market lists */}
            {loadingMarkets ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading markets…</p>
            ) : (
            <div className="space-y-6">

                {/* Upcoming */}
                {(!marketTimeFilter || marketTimeFilter !== "past") && (
                <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Upcoming
                    </p>
                    {filteredUpcoming.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {upcoming.length === 0 ? "No upcoming markets. Add one above." : "No upcoming markets match your filters."}
                    </p>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredUpcoming.map((m) => (
                        <MarketCard key={m.id} market={m} onLogSale={() => setLogSaleMarket(m)} onDelete={() => setDeleteMarket(m)} />
                        ))}
                    </div>
                    )}
                </div>
                )}

                {/* Past */}
                {(!marketTimeFilter || marketTimeFilter !== "upcoming") && (
                <div className={(!marketTimeFilter || marketTimeFilter === "all") ? "pt-2 border-t border-border" : ""}>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                    Past
                    </p>
                    {filteredPast.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {past.length === 0 ? "No past markets yet." : "No past markets match your filters."}
                    </p>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPast.map((m) => (
                        <MarketCard key={m.id} market={m} onLogSale={() => setLogSaleMarket(m)} onDelete={() => setDeleteMarket(m)} />
                        ))}
                    </div>
                    )}
                </div>
                )}

            </div>
            )}
            </CardContent>
          </Card>
        </section>

        <WavySeparator />

        {/* ═══ YOUR PRODUCTS ═══════════════════════════════════════ */}
        <section
          id="your-products"
          ref={(el) => { sectionRefs.current["your-products"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
          aria-label="Your Products"
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Your Products
              </h2>
              <p className="text-white/90 text-sm sm:text-base mt-1 leading-relaxed">
                View and manage your products across all sales channels.
              </p>
            </div>
          </div>

          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6">
              {loadingProducts ? (
                <p className="text-sm text-neutral-600 py-8 text-center">
                  Loading products…
                </p>
              ) : productError ? (
                <p
                  className="text-sm text-red-700 py-8 text-center"
                  role="alert"
                >
                  {productError}
                </p>
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

      {/* ── Log sale modal ── */}
    {(logSaleOpen || logSaleMarket) && (
    <LogSaleModal
        products={products}                    // triggers picker on step 1
        marketId={logSaleMarket?.id}
        marketName={logSaleMarket?.name}
        onClose={() => { setLogSaleOpen(false); setLogSaleMarket(null); }}
        onLogged={() => { setLogSaleOpen(false); setLogSaleMarket(null); loadProducts(); loadMarkets(); }}
    />
    )}
    {addMarketOpen && (
    <AddMarketModal
        onClose={() => setAddMarketOpen(false)}
        onCreated={() => { setAddMarketOpen(false); loadMarkets(); }}
    />
    )}
    </div>
  );
}