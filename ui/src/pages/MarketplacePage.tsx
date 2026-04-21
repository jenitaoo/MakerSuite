import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProductTable from "../components/products/ProductTable";
import { getCookie, API_URL } from "../../src/services/api.ts";
import { Product } from "../../src/types/product";
import {
  Store,
  Package,
  PlusCircle,
  ClipboardList,
  MapPin,
  Calendar,
  ChevronRight,
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
import Market_Bunny_Illustration from "../assets/misc/Market_Bunny_Illust.png";

// Lazy load modals to speed up initial render
const LogSaleModal = lazy(() => import("../components/products/LogSaleModal"));
const AddMarketModal = lazy(() => import("../components/products/AddMarketModal"));
const DeleteMarketModal = lazy(() => import("../components/products/DeleteMarketModal"));

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
    className: "border-red-300 bg-red-100 text-red-600",
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
            aria-label="Log a sale for this market"
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
  const [logSaleMarket, setLogSaleMarket] = useState<Market | null>(null);
  const [addMarketOpen, setAddMarketOpen] = useState(false);

  // Nav
  const [activeSection, setActiveSection] = useState<string>("at-a-glance");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // ── Data fetching ───────────────────────────────────────────────────────────

  const loadProducts = () => {
    setLoadingProducts(true);
    setProductError(null);
    fetch(`${API_URL}/api/product-list/?page_size=200`, {
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
    fetch(`${API_URL}/api/markets/`, {
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

  useEffect(() => {
    const handleStorageChange = () => {
      loadProducts();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadProducts]);

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Etsy sync ───────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setLoadingProducts(true);
    try {
      const shopRes = await fetch(`${API_URL}/api/etsy/shop/`, {
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
                aria-label="Connect to Etsy"
                onClick={() => {
                    toast.dismiss(t.id);
                    window.location.href = `${API_URL}/api/etsy/login?return_to=${encodeURIComponent(
                    window.location.pathname
                    )}`;
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-[hsl(var(--primary))] text-white hover:opacity-90"
                >
                Redirect and Connect
                </button>
                <button
                aria-label="Cancel connecting to Etsy"
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
      console.log("shop_id:", shop_id);
      const importUrl = `${API_URL}/api/etsy/shops/${shop_id}/import/`;
      console.log("Import URL:", importUrl);
      await toast.promise(
        fetch(`${API_URL}/api/etsy/shops/${shop_id}/import/`, {
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
          return (data.imported ?? 0) + (data.updated ?? 0);
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
                hover:bg-[#6b3a2e] ${
                  active
                    ? "bg-[#6b3a2e]/40 text-white"
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
          <div className="scalloped-intro bg-[#6b3a2e] px-4 sm:px-8 lg:px-16 pt-6 sm:pt-12 pb-10 sm:pb-20 space-y-6 sm:space-y-10">
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
                    Your Marketplace brings together everything you sell. Connect your online stores to unlock product syncing, then manage markets, track sales, and keep your business organised across every sales platform.
                  </p>
                </div>

                <div className="border-t border-white/30 w-full" />

                {/* What's Here — hidden on mobile */}
                <div className="hidden sm:block space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white text-center">
                    What's Here?
                  </h2>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
                    {[
                      {
                        icon: Store,
                        label: "Your Markets",
                        sub: "Plan and manage craft markets from application to final sales. Log in-person sales and keep a full record of every event you attend.",
                        id: "your-markets",
                      },
                      {
                        icon: Package,
                        label: "Your Products",
                        sub: "All your products in one place — synced from Etsy, Shopify, or created directly in MakerSuite.",
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
                    onClick={() => scrollTo("your-markets")}
                    aria-label="Scroll to Your Markets section"
                    className="flex flex-col items-center gap-1 text-white hover:text-white transition-colors animate-bounce"
                  >
                    <ChevronDown className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

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
                    This is where you plan every craft market you attend. Start by adding a market, then track your application status, organise your setup, and log sales on the day. MakerSuite keeps a full history so you can see how each event performs.
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

                <Select aria-label="Status Filter" value={marketStatusFilter} onValueChange={setMarketStatusFilter}>
                <SelectTrigger aria-label="Status Filter" className="w-[140px] h-8 text-sm">
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

                <Select aria-label="Time Filter" value={marketTimeFilter} onValueChange={setMarketTimeFilter}>
                <SelectTrigger aria-label="Time Filter" className="w-[140px] h-8 text-sm">
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
                    aria-label="Add a new market"
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
                        <MarketCard
                            key={m.id}
                              market={m}
                              onLogSale={() => {
                                setLogSaleMarket(m);
                                setLogSaleOpen(true);
                              }}
                              onDelete={() => setDeleteMarket(m)}
                          />
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
                This is where you manage everything you sell. Add or import products from your connected stores, then keep stock, listings, and sales synced in one place. Each product is linked to your Studio so inventory updates automatically when you make or sell items.
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

      {/* ── Modals ── */}
      <Suspense fallback={<div className="p-4 text-sm">Loading...</div>}>
        {logSaleMarket && (
          <LogSaleModal
            marketId={logSaleMarket.id}
            marketName={logSaleMarket.name}
            onClose={() => setLogSaleMarket(null)}
            onLogged={() => {
              setLogSaleMarket(null);
              loadProducts();
              loadMarkets();
            }}
          />
        )}

        {deleteMarket && (
          <DeleteMarketModal
            market={deleteMarket}
            onClose={() => setDeleteMarket(null)}
            onDeleted={() => {
              setDeleteMarket(null);
              loadMarkets();
            }}
          />
        )}

        {addMarketOpen && (
          <AddMarketModal
            onClose={() => setAddMarketOpen(false)}
            onCreated={() => {
              setAddMarketOpen(false);
              loadMarkets();
            }}
          />
        )}
      </Suspense>
    </div>
  );
}