import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCookie, API_URL } from "../services/api";
import { getProjects, getMaterials } from "../services/inventoryApi";
import { Project, RawMaterial } from "../types/inventory";
import {
  TrendingUp, ToolCase, Package, ShoppingBag,
  Euro, Star, AlertTriangle, Hammer, Store,
  ArrowRight, CheckCircle2, Clock, BarChart3, Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaleLog = {
  id: number;
  product: number;
  units_sold: number;
  sale_price: string | null;
  sale_date: string;
  tags?: { id: number; name: string }[];
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

type TimeFilter = "month" | "3months" | "all";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inWindow(dateStr: string, filter: TimeFilter): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  if (filter === "all") return true;
  if (filter === "month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  return d >= cutoff;
}

function formatDuration(mins: number | null | undefined) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IE", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, sub, highlight,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-5 flex flex-col gap-2 ${highlight ? "bg-[#907680]/8 border-[#907680]/30" : "bg-white border-neutral-200"}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-600 uppercase tracking-wide leading-tight">
          {label}
        </span>
        <Icon className={`w-4 h-4 ${highlight ? "text-[#907680]" : "text-neutral-400"}`} aria-hidden="true" />
      </div>
      <div className={`text-3xl font-bold ${highlight ? "text-[#907680]" : "text-neutral-900"}`}>{value}</div>
      {sub && <div className="text-sm text-neutral-500">{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-3">
      {children}
    </p>
  );
}

function TimeToggle({ value, onChange }: { value: TimeFilter; onChange: (v: TimeFilter) => void }) {
  const options: { value: TimeFilter; label: string }[] = [
    { value: "month", label: "This Month" },
    { value: "3months", label: "Last 3 Months" },
    { value: "all", label: "All Time" },
  ];
  return (
    <div className="flex rounded-md border border-neutral-200 overflow-hidden bg-white shrink-0">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            value === o.value
              ? "bg-[#907680] text-white"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ActionItem({
  icon: Icon,
  color,
  message,
  detail,
  actionLabel,
  onAction,
}: {
  icon: React.ElementType;
  color: "red" | "amber";
  message: string;
  detail?: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const colours = {
    red: {
      wrap: "border-red-200 bg-red-50",
      icon: "text-red-600",
      text: "text-red-700",
      btn: "border-red-300 text-red-700 hover:bg-red-100",
    },
    amber: {
      wrap: "border-amber-200 bg-amber-50",
      icon: "text-amber-600",
      text: "text-amber-700",
      btn: "border-amber-300 text-amber-700 hover:bg-amber-100",
    },
  }[color];

  return (
    <div className={`rounded-md border px-4 py-3 flex items-center gap-3 ${colours.wrap}`} role="alert">
      <Icon className={`h-4 w-4 shrink-0 ${colours.icon}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${colours.text}`}>{message}</p>
        {detail && <p className={`text-xs mt-0.5 truncate ${colours.text} opacity-80`}>{detail}</p>}
      </div>
      <Button
        size="sm" variant="outline"
        className={`shrink-0 text-xs h-7 ${colours.btn}`}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const navigate = useNavigate();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");

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
      fetch(`${API_URL}/api/product-list/?page_size=200`, { credentials: "include", headers })
        .then((r) => r.json()).then((d) => d.results ?? d),
      fetch(`${API_URL}/api/markets/`, { credentials: "include", headers })
        .then((r) => r.json()).then((d) => d.results ?? d),
    ])
      .then(async ([projectData, materialData, productData, marketData]) => {
        const projectList: Project[] = Array.isArray(projectData) ? projectData : projectData.results ?? [];
        const materialList: RawMaterial[] = Array.isArray(materialData) ? materialData : materialData.results ?? [];
        setProjects(projectList);
        setMaterials(materialList);
        setProducts(productData);
        setMarkets(marketData);

        const salePromises = (productData as Product[]).map((p) =>
          fetch(`${API_URL}/api/products/${p.id}/sales/`, { credentials: "include", headers })
            .then((r) => r.ok ? r.json() : [])
            .then((d) => Array.isArray(d) ? d : d.results ?? [])
        );
        const allSales = await Promise.all(salePromises);
        setSaleLogs(allSales.flat());
      })
      .catch(() => toast.error("Failed to load insights"))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  // Action items — stock
  const outOfStockProducts = products.filter((p) => p.internal_quantity === 0);
  const lowStockProducts = products.filter((p) => (p.internal_quantity ?? 0) > 0 && (p.internal_quantity ?? 0) <= 3);
  const lowStockMaterials = materials.filter((m) => m.is_low_stock);
  const zeroStockMaterials = materials.filter((m) => parseFloat(m.quantity ?? "0") === 0);

  // Action items — pricing
  const cogsFlagged = (projects as any[]).filter((p) => {
    if (!p.material_cost_per_unit || !p.product_price) return false;
    return parseFloat(p.material_cost_per_unit) >= parseFloat(p.product_price) * 0.8;
  });

  // Action items — labour cost coverage (pays under minimum wage)
  const MINIMUM_WAGE = 14.15;
  const labourFlagged = (projects as any[]).filter((p) => {
    if (!p.avg_duration_minutes || !p.product_price || !p.material_cost_per_unit) return false;
    const labourCost = (p.avg_duration_minutes / 60) * MINIMUM_WAGE;
    const margin = parseFloat(p.product_price) - parseFloat(p.material_cost_per_unit);
    return margin < labourCost;
  });

  // Action items — idle projects (no makes in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const idleProjects = (projects as any[]).filter((p) => {
    if (!p.make_logs || p.make_logs.length === 0) return false; // never made = new, not idle
    const mostRecent = p.make_logs
      .map((l: any) => l.date_made ? new Date(l.date_made) : new Date(l.created_at))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0];
    return mostRecent < thirtyDaysAgo;
  });

  const totalActionItems =
    outOfStockProducts.length +
    lowStockProducts.length +
    lowStockMaterials.length +
    zeroStockMaterials.length +
    cogsFlagged.length +
    labourFlagged.length +
    idleProjects.length;

  // Sales
  const filteredSales = saleLogs.filter((s) => inWindow(s.sale_date, timeFilter));
  const unitsInWindow = filteredSales.reduce((sum, s) => sum + s.units_sold, 0);
  const revenueInWindow = filteredSales.reduce((sum, s) =>
    sum + (s.sale_price ? parseFloat(s.sale_price) : 0), 0
  );
  const avgSaleValue = filteredSales.length > 0 ? revenueInWindow / filteredSales.length : 0;

  // All-time best seller
  const unitsByProduct: Record<number, number> = {};
  saleLogs.forEach((s) => {
    unitsByProduct[s.product] = (unitsByProduct[s.product] || 0) + s.units_sold;
  });
  const bestSellerId = Object.entries(unitsByProduct).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestSeller = products.find((p) => p.id === Number(bestSellerId));

  // Per-product breakdown in window
  const unitsByProductInWindow: Record<number, number> = {};
  const revenueByProduct: Record<number, number> = {};
  filteredSales.forEach((s) => {
    unitsByProductInWindow[s.product] = (unitsByProductInWindow[s.product] || 0) + s.units_sold;
    revenueByProduct[s.product] = (revenueByProduct[s.product] || 0) + (s.sale_price ? parseFloat(s.sale_price) : 0);
  });

  // Profit per product (revenue − COGS × units sold)
  const profitByProduct: Record<number, number | null> = {};
  Object.keys(unitsByProductInWindow).forEach((pid) => {
    const project = (projects as any[]).find((p) => p.product === Number(pid));
    if (!project?.material_cost_per_unit) { profitByProduct[Number(pid)] = null; return; }
    const cogs = parseFloat(project.material_cost_per_unit) * unitsByProductInWindow[Number(pid)];
    profitByProduct[Number(pid)] = (revenueByProduct[Number(pid)] ?? 0) - cogs;
  });

  // Makes in window
  const makesInWindow = (projects as any[]).reduce((sum: number, p: any) => {
    const logs = (p.make_logs ?? []).filter((l: any) =>
      l.date_made ? inWindow(l.date_made, timeFilter) : timeFilter === "all"
    );
    return sum + logs.reduce((s: number, l: any) => s + l.units_made, 0);
  }, 0);

  // Production stats
  const totalUnitsMade = projects.reduce((s, p) => s + (p as any).units_made, 0);
  const projectsWithTime = (projects as any[]).filter((p) => p.avg_duration_minutes != null);
  const avgMakeTime = projectsWithTime.length > 0
    ? Math.round(projectsWithTime.reduce((s: number, p: any) => s + p.avg_duration_minutes, 0) / projectsWithTime.length)
    : null;

  // Sell-through rate per project — units_sold / units_made
  // Stock coverage — in_stock / avg monthly sales rate
  const avgMonthlySalesByProduct: Record<number, number> = {};
  if (saleLogs.length > 0) {
    // Find date range
    const dates = saleLogs.map((s) => new Date(s.sale_date).getTime());
    const earliest = new Date(Math.min(...dates));
    const now = new Date();
    const monthsSpan = Math.max(
      1,
      (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1
    );
    Object.entries(unitsByProduct).forEach(([pid, total]) => {
      avgMonthlySalesByProduct[Number(pid)] = total / monthsSpan;
    });
  }

  // Per-project production insights
  const projectInsights = (projects as any[]).map((p: any) => {
    const soldAllTime = p.units_sold ?? 0;
    const madeAllTime = p.units_made ?? 0;
    const sellThrough = madeAllTime > 0 ? Math.round((soldAllTime / madeAllTime) * 100) : null;

    const linkedProductId = p.product;
    const avgMonthly = linkedProductId ? avgMonthlySalesByProduct[linkedProductId] : null;
    const inStock = p.in_stock ?? 0;
    const stockCoverageMonths = avgMonthly && avgMonthly > 0
      ? +(inStock / avgMonthly).toFixed(1)
      : null;

    return { ...p, sellThrough, stockCoverageMonths };
  });

  // Aggregate sell-through across all projects with data
  const sellThroughProjects = projectInsights.filter((p) => p.sellThrough !== null);
  const avgSellThrough = sellThroughProjects.length > 0
    ? Math.round(sellThroughProjects.reduce((s, p) => s + p.sellThrough!, 0) / sellThroughProjects.length)
    : null;

  // Projects with low stock coverage (< 1 month)
  const lowCoverageProjects = projectInsights.filter(
    (p) => p.stockCoverageMonths !== null && p.stockCoverageMonths < 1 && p.in_stock > 0
  );

  // Market data
  const pastMarkets = markets.filter((m) => !m.is_upcoming);
  const onEtsy = products.filter((p) => p.platforms?.includes("Etsy")).length;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-white/70 text-sm">Loading insights…</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-10">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Insights</h1>
        <p className="text-white/80 mt-1 text-sm sm:text-base">
          Everything you need to know about your making and selling, all in one place. These insights are generated from everything you've logged in the Studio and the Marketplace so you can focus on growing your business!
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ACTION ITEMS
      ══════════════════════════════════════════════════════════════════ */}
      <section aria-label="Action Items">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-2xl font-bold text-white">Action Items</h2>
          {totalActionItems > 0 && (
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
              {totalActionItems}
            </span>
          )}
        </div>

        {totalActionItems === 0 ? (
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-neutral-700">You're all caught up!</p>
                <p className="text-xs text-neutral-500 mt-0.5">No products or materials need restocking, and all your pricing looks healthy.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Stock — products */}
            {outOfStockProducts.map((p) => (
              <ActionItem
                key={`oos-${p.id}`}
                icon={AlertTriangle}
                color="red"
                message={`${p.title} is out of stock`}
                detail="Customers can't buy this product until you restock."
                actionLabel="View Product"
                onAction={() => navigate(`/products/${p.id}/edit`)}
              />
            ))}
            {lowStockProducts.map((p) => (
              <ActionItem
                key={`ls-${p.id}`}
                icon={AlertTriangle}
                color="amber"
                message={`${p.title} is running low`}
                detail={`${p.internal_quantity} unit${p.internal_quantity !== 1 ? "s" : ""} remaining — log a make to restock.`}
                actionLabel="Log Make"
                onAction={() => navigate("/studio")}
              />
            ))}

            {/* Stock — materials */}
            {zeroStockMaterials.map((m) => (
              <ActionItem
                key={`zm-${m.id}`}
                icon={ToolCase}
                color="red"
                message={`${m.name} is out of stock`}
                detail="You have none of this material left. Restock before your next make."
                actionLabel="Go to Studio"
                onAction={() => navigate("/studio")}
              />
            ))}
            {lowStockMaterials.map((m) => (
              <ActionItem
                key={`lm-${m.id}`}
                icon={ToolCase}
                color="amber"
                message={`${m.name} is running low`}
                detail={`${m.quantity} ${m.unit_type} remaining (threshold: ${m.low_stock_threshold ?? "not set"}).`}
                actionLabel="Go to Studio"
                onAction={() => navigate("/studio")}
              />
            ))}

            {/* Stock coverage — selling faster than making */}
            {lowCoverageProjects.map((p: any) => (
              <ActionItem
                key={`cov-${p.id}`}
                icon={Layers}
                color="amber"
                message={`${p.name} has less than a month of stock left`}
                detail={`${p.in_stock} unit${p.in_stock !== 1 ? "s" : ""} in stock at your current sales rate. Consider logging a make soon.`}
                actionLabel="Log Make"
                onAction={() => navigate("/studio")}
              />
            ))}

            {/* Pricing — COGS */}
            {cogsFlagged.map((p: any) => (
              <ActionItem
                key={`cogs-${p.id}`}
                icon={Euro}
                color="amber"
                message={`${p.name} may be underpriced`}
                detail={`Material cost (€${parseFloat(p.material_cost_per_unit).toFixed(2)}) is ≥80% of sale price (€${parseFloat(p.product_price).toFixed(2)}). Consider raising your price.`}
                actionLabel="Review Project"
                onAction={() => navigate(`/studio/projects/${p.id}`)}
              />
            ))}

            {/* Pricing — labour coverage */}
            {labourFlagged.filter((p: any) => !cogsFlagged.some((c: any) => c.id === p.id)).map((p: any) => {
              const labourCost = (p.avg_duration_minutes / 60) * MINIMUM_WAGE;
              const margin = parseFloat(p.product_price) - parseFloat(p.material_cost_per_unit);
              return (
                <ActionItem
                  key={`labour-${p.id}`}
                  icon={Clock}
                  color="amber"
                  message={`${p.name} doesn't cover your labour at minimum wage`}
                  detail={`After materials, you have €${margin.toFixed(2)} left per unit — but ${formatDuration(p.avg_duration_minutes)} of work costs €${labourCost.toFixed(2)} at €${MINIMUM_WAGE}/hr.`}
                  actionLabel="Review Pricing"
                  onAction={() => navigate(`/studio/projects/${p.id}`)}
                />
              );
            })}

            {/* Idle projects */}
            {idleProjects.map((p: any) => (
              <ActionItem
                key={`idle-${p.id}`}
                icon={Hammer}
                color="amber"
                message={`${p.name} hasn't been made in over 30 days`}
                detail={p.in_stock === 0 ? "You're out of stock — time for a new batch?" : `${p.in_stock} unit${p.in_stock !== 1 ? "s" : ""} still in stock.`}
                actionLabel="View Project"
                onAction={() => navigate(`/studio/projects/${p.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          OVERVIEW
      ══════════════════════════════════════════════════════════════════ */}
      <section aria-label="Overview">
        <h2 className="text-2xl font-bold text-white mb-3">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Studio */}
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4 text-[#7B8F6F]" aria-hidden="true" />
                <SectionLabel>Studio</SectionLabel>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Projects" value={projects.length} icon={Package} />
                <StatCard label="Units Made" value={totalUnitsMade} icon={Hammer} />
                <StatCard
                  label="Avg Make Time"
                  value={formatDuration(avgMakeTime)}
                  icon={Clock}
                  sub={!avgMakeTime ? "Log makes with duration" : "per unit"}
                />
                <StatCard
                  label="Materials"
                  value={materials.length}
                  icon={ToolCase}
                  sub={lowStockMaterials.length > 0 ? `${lowStockMaterials.length} running low` : "All stocked"}
                />
              </div>
              <Button
                variant="outline" size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => navigate("/studio")}
              >
                Go to Studio <ArrowRight className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>

          {/* Marketplace */}
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-[#C17B6F]" aria-hidden="true" />
                <SectionLabel>Marketplace</SectionLabel>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Products" value={products.length} icon={Package} />
                <StatCard
                  label="On Etsy"
                  value={onEtsy}
                  icon={Store}
                  sub={`${products.length - onEtsy} not listed`}
                />
                <StatCard
                  label="Best Seller"
                  value={bestSeller?.title ?? "—"}
                  icon={Star}
                  sub={bestSeller ? `${unitsByProduct[bestSeller.id]} units all time` : "Log sales to track"}
                  highlight={!!bestSeller}
                />
                <StatCard
                  label="Total Revenue"
                  value={saleLogs.reduce((s, l) => s + (l.sale_price ? parseFloat(l.sale_price) : 0), 0) > 0
                    ? `€${saleLogs.reduce((s, l) => s + (l.sale_price ? parseFloat(l.sale_price) : 0), 0).toFixed(2)}`
                    : "—"}
                  icon={Euro}
                  sub="all time"
                  highlight={saleLogs.length > 0}
                />
              </div>
              <Button
                variant="outline" size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={() => navigate("/marketplace")}
              >
                Go to Marketplace <ArrowRight className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          PERFORMANCE
      ══════════════════════════════════════════════════════════════════ */}
      <section aria-label="Performance">
        <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
          <h2 className="text-2xl font-bold text-white">Performance</h2>
          <TimeToggle value={timeFilter} onChange={setTimeFilter} />
        </div>

        <div className="space-y-4">

          {/* Sales + Production side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Sales */}
            <Card className="bg-white border-neutral-200">
              <CardContent className="p-6 space-y-4">
                <SectionLabel>Sales</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Units Sold" value={unitsInWindow || "—"} icon={ShoppingBag} />
                  <StatCard
                    label="Revenue"
                    value={revenueInWindow > 0 ? `€${revenueInWindow.toFixed(2)}` : "—"}
                    icon={Euro}
                    highlight={revenueInWindow > 0}
                  />
                  <StatCard
                    label="Avg Sale Value"
                    value={avgSaleValue > 0 ? `€${avgSaleValue.toFixed(2)}` : "—"}
                    icon={TrendingUp}
                    sub="per transaction"
                  />
                  <StatCard
                    label="Transactions"
                    value={filteredSales.length || "—"}
                    icon={BarChart3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Production */}
            <Card className="bg-white border-neutral-200">
              <CardContent className="p-6 space-y-4">
                <SectionLabel>Production</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Units Made"
                    value={makesInWindow || "—"}
                    icon={Hammer}
                  />
                  <StatCard
                    label="Avg Make Time"
                    value={formatDuration(avgMakeTime)}
                    icon={Clock}
                    sub="per unit"
                  />
                  <StatCard
                    label="Avg Sell-Through"
                    value={avgSellThrough !== null ? `${avgSellThrough}%` : "—"}
                    icon={TrendingUp}
                    sub={avgSellThrough !== null
                      ? avgSellThrough >= 80 ? "Strong demand" : avgSellThrough >= 50 ? "Moderate" : "Consider making less"
                      : "Log sales to track"}
                    highlight={avgSellThrough !== null && avgSellThrough >= 80}
                  />
                  <StatCard
                    label="COGS Warnings"
                    value={cogsFlagged.length === 0 ? "✓" : cogsFlagged.length}
                    icon={AlertTriangle}
                    sub={cogsFlagged.length === 0 ? "Pricing looks healthy" : "Review pricing"}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-project production breakdown */}
          {projectInsights.filter((p) => p.units_made > 0).length > 0 && (
            <Card className="bg-white border-neutral-200">
              <CardContent className="p-6">
                <SectionLabel>Project Breakdown</SectionLabel>
                <div className="rounded-md border overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Project</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Made</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Sold</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Sell-Through</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Stock Left</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectInsights
                        .filter((p: any) => p.units_made > 0)
                        .sort((a: any, b: any) => b.units_made - a.units_made)
                        .map((p: any) => {
                          const coverageLow = p.stockCoverageMonths !== null && p.stockCoverageMonths < 1;
                          return (
                            <tr
                              key={p.id}
                              className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer"
                              onClick={() => navigate(`/studio/projects/${p.id}`)}
                            >
                              <td className="px-4 py-2.5 font-medium text-neutral-700">{p.name}</td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">{p.units_made}</td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">{p.units_sold}</td>
                              <td className="px-4 py-2.5 text-right">
                                {p.sellThrough !== null ? (
                                  <span className={p.sellThrough >= 80 ? "text-green-600 font-medium" : p.sellThrough >= 50 ? "text-amber-600" : "text-neutral-500"}>
                                    {p.sellThrough}%
                                  </span>
                                ) : <span className="text-neutral-400">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">{p.in_stock}</td>
                              <td className="px-4 py-2.5 text-right">
                                {p.stockCoverageMonths !== null ? (
                                  <span className={coverageLow ? "text-red-600 font-medium" : "text-neutral-700"}>
                                    {p.stockCoverageMonths < 1 ? "<1 mo" : `${p.stockCoverageMonths} mo`}
                                  </span>
                                ) : <span className="text-neutral-400">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-neutral-400 mt-2">
                  Sell-Through = units sold ÷ units made. Coverage = stock remaining at current monthly sales rate.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Product performance table */}
          {Object.keys(unitsByProductInWindow).length > 0 && (
            <Card className="bg-white border-neutral-200">
              <CardContent className="p-6">
                <SectionLabel>Product Performance</SectionLabel>
                <div className="rounded-md border overflow-hidden overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-50 border-b border-neutral-200">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Product</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Units Sold</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Revenue</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Est. Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(unitsByProductInWindow)
                        .sort((a, b) => b[1] - a[1])
                        .map(([pid, units]) => {
                          const product = products.find((p) => p.id === Number(pid));
                          const revenue = revenueByProduct[Number(pid)] ?? 0;
                          const profit = profitByProduct[Number(pid)];
                          const isLoss = profit !== null && profit < 0;
                          return (
                            <tr
                              key={pid}
                              className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 cursor-pointer"
                              onClick={() => navigate(`/products/${pid}/edit`)}
                            >
                              <td className="px-4 py-2.5 font-medium text-neutral-700">
                                {product?.title ?? `Product #${pid}`}
                              </td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">{units}</td>
                              <td className="px-4 py-2.5 text-right text-neutral-700">
                                {revenue > 0 ? `€${revenue.toFixed(2)}` : "—"}
                              </td>
                              <td className={`px-4 py-2.5 text-right font-medium ${
                                profit === null ? "text-neutral-400" :
                                isLoss ? "text-red-600" : "text-green-600"
                              }`}>
                                {profit === null
                                  ? <span className="text-xs font-normal text-neutral-400">no cost data</span>
                                  : isLoss
                                  ? `−€${Math.abs(profit).toFixed(2)}`
                                  : `€${profit.toFixed(2)}`}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-neutral-400 mt-2">
                  Est. Profit = Revenue − (Material Cost × Units Sold). Requires recipe costs set in Studio.
                </p>
              </CardContent>
            </Card>
          )}

          {filteredSales.length === 0 && (
            <Card className="bg-white border-neutral-200">
              <CardContent className="p-8 text-center text-muted-foreground">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-sm">No sales logged in this period.</p>
                <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => navigate("/marketplace")}>
                  Log a Sale <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          MARKET PERFORMANCE
      ══════════════════════════════════════════════════════════════════ */}
      {pastMarkets.length > 0 && (
        <section aria-label="Market Performance">
          <h2 className="text-lg font-bold text-white mb-3">Market Performance</h2>
          <Card className="bg-white border-neutral-200">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Total Markets" value={markets.length} icon={Store} />
                <StatCard label="Past Markets" value={pastMarkets.length} icon={BarChart3} />
                <StatCard label="Upcoming" value={markets.filter((m) => m.is_upcoming).length} icon={TrendingUp} />
              </div>
              <SectionLabel>Past Markets</SectionLabel>
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
                        <td className="px-4 py-2.5 text-right text-neutral-500">{fmtDate(m.date)}</td>
                        <td className="px-4 py-2.5 text-right text-neutral-700">{m.market_products?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-400">Click any row to open the market detail.</p>
            </CardContent>
          </Card>
        </section>
      )}

    </div>
  );
}