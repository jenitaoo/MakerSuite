    import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCookie } from "../services/api";
import { getProjects, getMaterials } from "../services/inventoryApi";
import { Project, RawMaterial } from "../types/inventory";
import {
  LayoutGrid, TrendingUp, FlaskConical, Package,
  ShoppingBag, Euro, Star, AlertTriangle, ChevronDown,
  BarChart3, Hammer, Store, ArrowRight,
} from "lucide-react";
import Insights_Bunny_Illustration from "../assets/misc/Insights_Bunny_Illust.png";

// ─── Insights accent colour ───────────────────────────────────────────────────
const INSIGHTS = "#907680";

// ─── Nav sections ─────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "at-a-glance",       label: "At a Glance",       icon: LayoutGrid  },
  { id: "sales",             label: "Sales",             icon: TrendingUp  },
  { id: "production-health", label: "Production",        icon: Hammer      },
  { id: "materials-stock",   label: "Materials",         icon: FlaskConical},
  { id: "marketplace",       label: "Marketplace",       icon: Store       },
  { id: "market-performance",label: "Markets",           icon: BarChart3   },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────
type SaleLog = {
  id: number;
  product: number;
  units_sold: number;
  sale_price: string | null;
  sale_date: string;
};

type Market = {
  id: number;
  name: string;
  date: string;
  is_upcoming: boolean;
  market_products: { product: number; units_brought: number }[];
};

type Product = {
  id: number;
  title: string;
  internal_quantity: number;
  internal_price: string | null;
  platforms: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isThisMonth(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatDuration(mins: number | null | undefined) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Shared components ────────────────────────────────────────────────────────
function WavySeparator() {
  return (
    <div className="relative w-full overflow-x-hidden my-2" aria-hidden="true">
      <div
        className="wavy-line-insights opacity-60 absolute left-1/2"
        style={{ width: "100vw", transform: "translateX(-50%)" }}
      />
      <div className="wavy-line-insights invisible" />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, sub,
}: {
  label: string; value: string | number; icon: React.ElementType; sub?: string;
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

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-white/90 text-sm sm:text-base mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("at-a-glance");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const [projects, setProjects] = useState<Project[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [saleLogs, setSaleLogs] = useState<SaleLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = {
      Accept: "application/json",
      "X-CSRFToken": getCookie("csrftoken") ?? "",
    };

    Promise.all([
      getProjects(),
      getMaterials(),
      fetch("/api/product-list/?page_size=200", { credentials: "include", headers })
        .then((r) => r.json()).then((d) => d.results ?? d),
      fetch("/api/markets/", { credentials: "include", headers })
        .then((r) => r.json()).then((d) => d.results ?? d),
    ])
      .then(async ([projectData, materialData, productData, marketData]) => {
        const projectList: Project[] = Array.isArray(projectData) ? projectData : projectData.results ?? [];
        const materialList: RawMaterial[] = Array.isArray(materialData) ? materialData : materialData.results ?? [];
        setProjects(projectList);
        setMaterials(materialList);
        setProducts(productData);
        setMarkets(marketData);

        // Fetch sale logs for all products
        const salePromises = productData.map((p: Product) =>
          fetch(`/api/products/${p.id}/sales/`, { credentials: "include", headers })
            .then((r) => r.ok ? r.json() : [])
            .then((d) => (Array.isArray(d) ? d : d.results ?? []))
        );
        const allSales = await Promise.all(salePromises);
        setSaleLogs(allSales.flat());
      })
      .catch(() => toast.error("Failed to load insights"))
      .finally(() => setLoading(false));
  }, []);

  // ── IntersectionObserver ──────────────────────────────────────────────────
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
  }, [loading]);

  const scrollTo = (id: string) =>
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // ── Derived: Sales ────────────────────────────────────────────────────────
  const salesThisMonth = saleLogs.filter((s) => isThisMonth(s.sale_date));
  const unitsThisMonth = salesThisMonth.reduce((sum, s) => sum + s.units_sold, 0);
  const revenueThisMonth = salesThisMonth.reduce((sum, s) => {
    return sum + (s.sale_price ? parseFloat(s.sale_price) * s.units_sold : 0);
  }, 0);
  const avgSaleValue = salesThisMonth.length > 0
    ? revenueThisMonth / salesThisMonth.length : 0;

  // Best seller by units sold all time
  const unitsByProduct: Record<number, number> = {};
  saleLogs.forEach((s) => {
    unitsByProduct[s.product] = (unitsByProduct[s.product] || 0) + s.units_sold;
  });
  const bestSellerId = Object.entries(unitsByProduct).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestSeller = products.find((p) => p.id === Number(bestSellerId));

  // ── Derived: Production ───────────────────────────────────────────────────
  const projectsWithMakes = projects.filter((p) => p.units_made > 0);
  const projectsOutOfStock = projects.filter((p) => p.in_stock === 0 && p.units_made > 0);
  const projectsWithTime = projects.filter((p) => p.avg_duration_minutes != null);
  const avgMakeTime = projectsWithTime.length > 0
    ? Math.round(projectsWithTime.reduce((s, p) => s + (p.avg_duration_minutes ?? 0), 0) / projectsWithTime.length)
    : null;

  // COGS analysis — projects where we have both material cost and a linked product price
  const cogsFlagged = projects.filter((p) => {
    if (!p.material_cost_per_unit || !p.product_price) return false;
    const cost = parseFloat(p.material_cost_per_unit);
    const price = parseFloat(p.product_price);
    return cost >= price * 0.8; // flagged if COGS is 80%+ of sale price
  });

  // ── Derived: Materials ────────────────────────────────────────────────────
  const lowStock = materials.filter((m) => m.is_low_stock);
  const zeroStock = materials.filter((m) => parseFloat(m.quantity) === 0);

  // ── Derived: Marketplace ──────────────────────────────────────────────────
  const onEtsy = products.filter((p) => p.platforms?.includes("Etsy")).length;
  const outOfStock = products.filter((p) => p.internal_quantity === 0);
  const notListed = products.filter(
    (p) => !p.platforms || (p.platforms.length === 1 && p.platforms[0] === "MakerSuite")
  );

  // ── Derived: Markets ──────────────────────────────────────────────────────
  const pastMarkets = markets.filter((m) => !m.is_upcoming);
  const marketRevenue: { market: Market; revenue: number; unitsSold: number }[] = pastMarkets.map((m) => {
    const marketSales = saleLogs; // all sales — ideally filtered by market but market FK not on SaleLog client-side
    const revenue = 0; // placeholder — market-specific revenue requires the market sales endpoint
    return { market: m, revenue, unitsSold: 0 };
  });

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-white/70 text-sm">Loading insights…</p>
    </div>
  );

  return (
    <div className="relative flex overflow-x-hidden">

      {/* ── Side nav ── */}
      <nav aria-label="Page sections" className="fixed left-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 pl-2">
        {NAV_SECTIONS.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              aria-label={`Navigate to ${label}`}
              aria-current={active ? "location" : undefined}
              className={`group flex items-center gap-2 py-2 px-2 rounded-lg transition-all text-left
                hover:bg-[#8B7BA8] ${active ? "bg-[#8B7BA8]/40 text-white" : "text-white/40 hover:text-white"}`}
            >
              <div className={`w-1 h-6 rounded-full transition-all shrink-0 ${
                active ? "bg-white" : "bg-white/20 group-hover:bg-white/40"
              }`} />
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
          aria-label="Insights overview"
        >
          <div
            className="scalloped-intro px-4 sm:px-8 lg:px-16 pt-6 sm:pt-12 pb-10 sm:pb-20 space-y-6 sm:space-y-10"
            style={{ backgroundColor: INSIGHTS }}
          >
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              <div className="w-full lg:w-2/5 overflow-visible shrink-0 flex items-center justify-center">
                <img
                  src={Insights_Bunny_Illustration}
                  alt="Illustration of a bunny reviewing charts"
                  className="w-1/2 lg:w-full max-h-40 sm:max-h-none object-contain lg:scale-125"
                />
              </div>

              <div className="flex-1 space-y-6 sm:space-y-8">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">Insights</h1>
                  <p className="mt-3 text-white/90 text-base leading-relaxed">
                    A friendly debrief on how your making and selling are going — sales trends, production health, material stock and marketplace performance in one place.
                  </p>
                </div>

                <div className="border-t border-white/30 w-full" />

                <div className="hidden sm:block space-y-3 sm:space-y-4">
                  <h2 className="text-lg sm:text-xl font-bold text-white text-center">What's Here?</h2>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 lg:gap-6">
                    {[
                      { icon: TrendingUp,  label: "Sales",      sub: "Revenue, units sold and your best seller",    id: "sales"              },
                      { icon: Hammer,      label: "Production", sub: "COGS, make time and stock health per project", id: "production-health"  },
                      { icon: Store,       label: "Marketplace",sub: "Listings, stock alerts and platform coverage", id: "marketplace"        },
                    ].map(({ icon: Icon, label, sub, id }) => (
                      <button
                        key={label}
                        onClick={() => scrollTo(id)}
                        aria-label={`Go to ${label}`}
                        className="bg-white/15 hover:bg-white/25 border border-white/30 hover:border-white/50 rounded-xl p-3 sm:p-4 text-left transition-colors group w-full"
                      >
                        <div className="rounded-lg bg-white/15 flex items-center justify-center mb-2 p-3">
                          <Icon className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-semibold text-white leading-tight">{label}</p>
                        <p className="text-sm text-white/80 mt-1 leading-snug">{sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => scrollTo("at-a-glance")}
                    aria-label="Scroll to At a Glance"
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
          <SectionHeader
            title="At a Glance"
            subtitle="Your key numbers across making and selling this month."
          />

          {/* Alerts */}
          {outOfStock.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 flex items-start gap-3" role="alert">
              <AlertTriangle className="h-4 w-4 text-red-700 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-700">{outOfStock.length} product{outOfStock.length !== 1 ? "s" : ""} out of stock</p>
                <p className="text-sm text-red-700 mt-0.5 truncate">{outOfStock.map((p) => p.title).join(", ")}</p>
              </div>
              <Button size="sm" variant="outline" className="border-red-400 text-red-700 hover:bg-red-100 shrink-0 font-semibold" onClick={() => navigate("/marketplace")}>
                View
              </Button>
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3" role="alert">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-700">{lowStock.length} material{lowStock.length !== 1 ? "s" : ""} running low</p>
                <p className="text-sm text-amber-700 mt-0.5 truncate">{lowStock.map((m) => m.name).join(", ")}</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0 font-semibold" onClick={() => navigate("/studio")}>
                View
              </Button>
            </div>
          )}
          {cogsFlagged.length > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3" role="alert">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-700">{cogsFlagged.length} project{cogsFlagged.length !== 1 ? "s" : ""} where material cost is close to or exceeds sale price</p>
                <p className="text-sm text-amber-700 mt-0.5 truncate">{cogsFlagged.map((p) => p.name).join(", ")}</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100 shrink-0 font-semibold" onClick={() => scrollTo("production-health")}>
                Review
              </Button>
            </div>
          )}

          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-neutral-700 pt-1">This Month</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Units Sold" value={unitsThisMonth || "—"} icon={ShoppingBag} sub={unitsThisMonth === 0 ? "No sales logged yet" : undefined} />
                <StatCard label="Revenue" value={revenueThisMonth > 0 ? `€${revenueThisMonth.toFixed(2)}` : "—"} icon={Euro} sub={revenueThisMonth === 0 ? "No sales logged yet" : undefined} />
                <StatCard label="Best Seller" value={bestSeller?.title ?? "—"} icon={Star} sub={bestSeller ? `${unitsByProduct[bestSeller.id]} units total` : "Log sales to track"} />
                <StatCard label="Avg Sale Value" value={avgSaleValue > 0 ? `€${avgSaleValue.toFixed(2)}` : "—"} icon={TrendingUp} sub="per transaction this month" />
              </div>
            </CardContent>
          </Card>
        </section>

        <WavySeparator />

        {/* ═══ SALES OVERVIEW ══════════════════════════════════════════════ */}
        <section
          id="sales"
          ref={(el) => { sectionRefs.current["sales"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
          aria-label="Sales Overview"
        >
          <SectionHeader
            title="Sales Overview"
            subtitle="Revenue, units sold and your top performers across all time."
          />
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Sales Logged" value={saleLogs.length} icon={ShoppingBag} />
                <StatCard label="Total Units Sold" value={Object.values(unitsByProduct).reduce((a, b) => a + b, 0) || "—"} icon={Package} />
                <StatCard
                  label="Total Revenue"
                  value={saleLogs.reduce((sum, s) => sum + (s.sale_price ? parseFloat(s.sale_price) * s.units_sold : 0), 0) > 0
                    ? `€${saleLogs.reduce((sum, s) => sum + (s.sale_price ? parseFloat(s.sale_price) * s.units_sold : 0), 0).toFixed(2)}`
                    : "—"}
                  icon={Euro}
                />
                <StatCard label="Best Seller" value={bestSeller?.title ?? "—"} icon={Star} sub={bestSeller ? `${unitsByProduct[bestSeller.id]} units` : undefined} />
              </div>

              {/* Per-product sales breakdown */}
              {Object.keys(unitsByProduct).length > 0 && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-neutral-700 mb-3">Sales by Product</p>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Product</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Units Sold</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(unitsByProduct)
                          .sort((a, b) => b[1] - a[1])
                          .map(([productId, units]) => {
                            const product = products.find((p) => p.id === Number(productId));
                            const revenue = saleLogs
                              .filter((s) => s.product === Number(productId))
                              .reduce((sum, s) => sum + (s.sale_price ? parseFloat(s.sale_price) * s.units_sold : 0), 0);
                            return (
                              <tr key={productId} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                                <td className="px-4 py-2.5 font-medium text-neutral-700">{product?.title ?? `Product #${productId}`}</td>
                                <td className="px-4 py-2.5 text-right text-neutral-700">{units}</td>
                                <td className="px-4 py-2.5 text-right text-neutral-700">{revenue > 0 ? `€${revenue.toFixed(2)}` : "—"}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {saleLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No sales logged yet. Log a sale from Marketplace to see your data here.</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => navigate("/marketplace")}>
                    Go to Marketplace <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <WavySeparator />

        {/* ═══ PRODUCTION HEALTH ═══════════════════════════════════════════ */}
        <section
          id="production-health"
          ref={(el) => { sectionRefs.current["production-health"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
          aria-label="Production Health"
        >
          <SectionHeader
            title="Production Health"
            subtitle="COGS, make times and stock levels across your projects."
          />
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Projects" value={projects.length} icon={Package} />
                <StatCard label="Units Made" value={projects.reduce((s, p) => s + p.units_made, 0)} icon={Hammer} />
                <StatCard label="Avg Make Time" value={formatDuration(avgMakeTime)} icon={TrendingUp} sub={avgMakeTime ? "per unit across all projects" : "Log makes with duration"} />
                <StatCard label="COGS Warnings" value={cogsFlagged.length} icon={AlertTriangle} sub={cogsFlagged.length === 0 ? "All projects look healthy" : "Review pricing"} />
              </div>

              {/* Project breakdown table */}
              {projects.length > 0 && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-neutral-700 mb-3">Project Breakdown</p>
                  <div className="rounded-md border overflow-hidden overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Project</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Units Made</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">In Stock</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Material Cost</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Sale Price</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Avg Make Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projects.map((p) => {
                          const isFlagged = cogsFlagged.some((c) => c.id === p.id);
                          return (
                            <tr
                              key={p.id}
                              className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer ${isFlagged ? "bg-amber-50/50" : ""}`}
                              onClick={() => navigate(`/studio/projects/${p.id}`)}
                            >
                              <td className="px-4 py-2.5 font-medium text-neutral-700">
                                <div className="flex items-center gap-2">
                                  {p.name}
                                  {isFlagged && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-label="COGS warning" />}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">{p.units_made}</td>
                              <td className="px-4 py-2.5 text-right">
                                <span className={p.in_stock === 0 && p.units_made > 0 ? "text-red-600 font-medium" : "text-neutral-700"}>
                                  {p.in_stock}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">
                                {p.material_cost_per_unit ? `€${parseFloat(p.material_cost_per_unit).toFixed(2)}` : <span className="text-neutral-400">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">
                                {p.product_price ? `€${parseFloat(p.product_price).toFixed(2)}` : <span className="text-neutral-400">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">{formatDuration(p.avg_duration_minutes)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Click any row to open the project.</p>
                </div>
              )}

              {projects.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Hammer className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No projects yet. Create one in Studio to track your production.</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => navigate("/studio")}>
                    Go to Studio <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <WavySeparator />

        {/* ═══ MATERIALS & STOCK ═══════════════════════════════════════════ */}
        <section
          id="materials-stock"
          ref={(el) => { sectionRefs.current["materials-stock"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
          aria-label="Materials and Stock"
        >
          <SectionHeader
            title="Materials & Stock"
            subtitle="Raw material levels across your studio."
          />
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Materials" value={materials.length} icon={FlaskConical} />
                <StatCard label="Low Stock" value={lowStock.length} icon={AlertTriangle} sub={lowStock.length === 0 ? "All materials stocked" : "Need restocking"} />
                <StatCard label="Out of Stock" value={zeroStock.length} icon={Package} sub={zeroStock.length === 0 ? "None at zero" : "Restock needed"} />
                <StatCard
                  label="Avg Cost/Unit"
                  value={(() => {
                    const withCost = materials.filter((m) => m.cost_per_unit);
                    if (!withCost.length) return "—";
                    const avg = withCost.reduce((s, m) => s + parseFloat(m.cost_per_unit!), 0) / withCost.length;
                    return `€${avg.toFixed(2)}`;
                  })()}
                  icon={Euro}
                />
              </div>

              {lowStock.length > 0 && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-neutral-700 mb-3">Low Stock Materials</p>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Material</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">In Stock</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Threshold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStock.map((m) => (
                          <tr key={m.id} className="border-b border-neutral-100 last:border-0 bg-amber-50/40">
                            <td className="px-4 py-2.5 font-medium text-neutral-700">{m.name}</td>
                            <td className="px-4 py-2.5 text-right text-amber-700 font-medium">{m.quantity} {m.unit_type}</td>
                            <td className="px-4 py-2.5 text-right text-neutral-500">{m.low_stock_threshold ?? "—"} {m.unit_type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/studio")}>
                      Go to Materials <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}

              {materials.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No materials yet. Add them in Studio.</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => navigate("/studio")}>
                    Go to Studio <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <WavySeparator />

        {/* ═══ MARKETPLACE ═════════════════════════════════════════════════ */}
        <section
          id="marketplace"
          ref={(el) => { sectionRefs.current["marketplace"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
          aria-label="Marketplace"
        >
          <SectionHeader
            title="Marketplace"
            subtitle="Your product listings and platform coverage."
          />
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Products" value={products.length} icon={Package} />
                <StatCard label="Listed on Etsy" value={onEtsy} icon={Store} sub={products.length > 0 ? `${products.length - onEtsy} not on Etsy` : undefined} />
                <StatCard label="Out of Stock" value={outOfStock.length} icon={AlertTriangle} sub={outOfStock.length === 0 ? "All products stocked" : "Need restocking"} />
                <StatCard label="Not Listed" value={notListed.length} icon={Package} sub={notListed.length === 0 ? "All products listed" : "MakerSuite only"} />
              </div>

              {notListed.length > 0 && (
                <div className="rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3">
                  <p className="text-sm font-medium text-neutral-700 mb-1">Products not listed anywhere:</p>
                  <p className="text-sm text-neutral-600">{notListed.map((p) => p.title).join(", ")}</p>
                  <Button size="sm" variant="outline" className="mt-2 gap-1.5" onClick={() => navigate("/marketplace")}>
                    Manage listings <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <WavySeparator />

        {/* ═══ MARKET PERFORMANCE ══════════════════════════════════════════ */}
        <section
          id="market-performance"
          ref={(el) => { sectionRefs.current["market-performance"] = el; }}
          className="space-y-4 pt-8 sm:pt-12 scroll-mt-20"
          aria-label="Market Performance"
        >
          <SectionHeader
            title="Market Performance"
            subtitle="How your in-person markets have gone."
          />
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard label="Total Markets" value={markets.length} icon={Store} />
                <StatCard label="Past Markets" value={pastMarkets.length} icon={BarChart3} />
                <StatCard label="Upcoming Markets" value={markets.filter((m) => m.is_upcoming).length} icon={TrendingUp} />
              </div>

              {pastMarkets.length > 0 && (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-widest text-neutral-700 mb-3">Past Markets</p>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Market</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Date</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Products Brought</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastMarkets.map((m) => (
                          <tr
                            key={m.id}
                            className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer"
                            onClick={() => navigate(`/marketplace/markets/${m.id}`)}
                          >
                            <td className="px-4 py-2.5 font-medium text-neutral-700">{m.name}</td>
                            <td className="px-4 py-2.5 text-right text-neutral-600">
                              {new Date(m.date).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-4 py-2.5 text-right text-neutral-700">{m.market_products?.length ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Click any row to open the market detail.</p>
                </div>
              )}

              {markets.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No markets yet. Add one in Marketplace to track your in-person sales.</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => navigate("/marketplace")}>
                    Go to Marketplace <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}