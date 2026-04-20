import { useState, useEffect, useContext } from "react";
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
  Info, CheckCircle, AlertCircle, XCircle
} from "lucide-react";
import Insights_Bunny from "../assets/misc/Insights_Bunny_Illust.png";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthContext } from "../context/AuthContext";
import {
  calculateTotalRevenue,
  calculateUnitsInWindow,
  calculateAverageSaleValue,
  findBestSeller,
  groupUnitsByProduct,
  groupRevenueByProduct,
  isInTimeWindow,
  calculateTotalUnitsMade,
  calculateMakesInWindow,
  calculateAverageMakeTime,
  formatDuration,
  calculateSellThrough,
  calculateAverageSellThrough,
  calculateAverageMonthlySales,
  calculateStockCoverage,
  getStockHealthStatus,
  calculateEstimatedProfit,
  isCOSWarning,
  isLabourWarning,
  isIdleProject,
  getStockStatus,
  formatDate,
  TimeFilter,
  type StockHealth,
} from "../services/insightsCalculations";
import { SaleLog } from "../types/inventory";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  highlight,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const tooltipMap: Record<string, string> = {
    Projects: "Total number of projects in your Studio.",
    "Units Made": "Total units produced from all make logs across your projects.",
    "Avg Make Time": "Average time to make one unit, based on logged production durations.",
    Materials: "Total number of materials in your Studio.",
    Products: "All products currently listed in your Marketplace.",
    "On Etsy": "Products listed on Etsy.",
    "Best Seller": "Highest selling product based on total units sold.",
    "Total Revenue": "Total income from all recorded sales.",
    "Units Sold": "Units sold in selected period.",
    Revenue: "Revenue in selected time window.",
    "Avg Sale Value": "Average revenue per transaction.",
    Transactions: "Number of sales transactions.",
    "Avg Sell-Through":
      "Units sold ÷ units made. Tells you how much you're selling vs making - 70–90% strong, 50–70% average, <50% overproduction risk.",
    "COGS Warnings": "Products where cost is close to or exceeds price.",
  };

  const tooltipText =
    tooltipMap[label] ??
    `${label}: ${typeof value === "string" ? value : String(value)}`;

  return (
    <div
      className={`rounded-lg border p-5 flex flex-col gap-2 transition
        ${
          highlight
            ? "bg-[#593026]/8 border-[#593026]/30"
            : "bg-white border-neutral-200"
        }
        ${
          onClick
            ? "cursor-pointer hover:bg-neutral-50 hover:shadow-md"
            : ""
        }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="text-sm font-semibold text-neutral-600 uppercase tracking-wide leading-none">
            {label}
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-neutral-600 hover:text-neutral-600 cursor-pointer translate-y-[1px]">
                  <Info className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] bg-neutral-900 text-white border border-neutral-700">
                <p className="text-white">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Icon className="w-4 h-4 text-neutral-600" />
          {onClick && <span className="text-neutral-600">→</span>}
        </div>
      </div>

      <div
        className="font-bold text-lg text-neutral-900 line-clamp-2 break-words"
        title={typeof value === "string" ? value : String(value)}
      >
        {value}
      </div>

      {sub && <div className="text-sm text-neutral-500">{sub}</div>}
    </div>
  );
}

function WavySeparator() {
  return (
    <div className="wavy-line-insights relative w-full overflow-x-hidden my-0" aria-hidden="true">
      <div
        className="wavy-line opacity-40 absolute left-1/2"
        style={{ width: "100vw", transform: "translateX(-50%)" }}
      />
      <div className="wavy-line invisible" />
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
          aria-label={`Filter insights by ${o.label}`}
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
            value === o.value
              ? "bg-[#593026] text-white"
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
      wrap: "border-red-300 bg-red-100",
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
        {detail && <p className={`text-xs mt-0.5 truncate ${colours.text}`}>{detail}</p>}
      </div>
      <Button
        aria-label={actionLabel}
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

  // ─────────────────────────────────────────────────────────────────────────────
  // SALES METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  const filteredSales = saleLogs.filter((s) => isInTimeWindow(s.sale_date, timeFilter));
  const unitsInWindow = calculateUnitsInWindow(filteredSales);
  const revenueInWindow = calculateTotalRevenue(filteredSales);
  const avgSaleValue = calculateAverageSaleValue(revenueInWindow, filteredSales.length);

  const unitsByProduct = groupUnitsByProduct(saleLogs);
  const revenueByProduct = groupRevenueByProduct(filteredSales);
  const bestSellerId = findBestSeller(unitsByProduct);
  const bestSeller = products.find((p) => p.id === bestSellerId);

  // ─────────────────────────────────────────────────────────────────────────────
  // PRODUCTION METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  const makesInWindow = calculateMakesInWindow(projects, timeFilter);
  const totalUnitsMade = calculateTotalUnitsMade(projects);
  const avgMakeTime = calculateAverageMakeTime(projects);

  // ─────────────────────────────────────────────────────────────────────────────
  // STOCK METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  const outOfStockProducts = products.filter((p) => p.internal_quantity === 0);
  const lowStockProducts = products.filter(
    (p) => (p.internal_quantity ?? 0) > 0 && (p.internal_quantity ?? 0) <= 3
  );
  const lowStockMaterials = materials.filter((m) => m.is_low_stock);
  const zeroStockMaterials = materials.filter((m) => parseFloat(m.quantity ?? "0") === 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // PRICING WARNINGS
  // ─────────────────────────────────────────────────────────────────────────────

  const cogsFlagged = projects.filter((p) =>
    isCOSWarning(p.material_cost_per_unit, p.product_price)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // LABOUR WARNINGS
  // ─────────────────────────────────────────────────────────────────────────────

  const auth = useContext(AuthContext);
  const hourlyRate = parseFloat(auth?.user?.hourly_rate ?? "14.15");

  const labourFlagged = projects.filter((p) =>
    isLabourWarning(p.avg_duration_minutes, p.product_price, p.material_cost_per_unit, hourlyRate)
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // IDLE PROJECTS
  // ─────────────────────────────────────────────────────────────────────────────

  const idleProjects = projects.filter((p) => isIdleProject(p.make_logs));

  // ─────────────────────────────────────────────────────────────────────────────
  // SELL-THROUGH & STOCK COVERAGE
  // ─────────────────────────────────────────────────────────────────────────────

  const avgMonthlySalesByProduct = calculateAverageMonthlySales(unitsByProduct, saleLogs);

  const projectInsights = projects.map((p) => {
    const sellThrough = calculateSellThrough(p.units_sold, p.units_made);
    const avgMonthly = p.product ? avgMonthlySalesByProduct[p.product] : null;
    const stockHealthMonths = calculateStockCoverage(p.in_stock, avgMonthly ?? 0);

    return {
      ...p,
      sellThrough,
      stockHealthMonths,
    };
  });

  const avgSellThrough = calculateAverageSellThrough(projects);
  const lowStockHealthProjects = projectInsights.filter(
    (p) => p.stockHealthMonths !== null && p.stockHealthMonths < 1 && p.in_stock > 0
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // MARKET METRICS
  // ─────────────────────────────────────────────────────────────────────────────

  const pastMarkets = markets.filter((m) => !m.is_upcoming);
  const onEtsy = products.filter((p) => p.platforms?.includes("Etsy")).length;

  // ─────────────────────────────────────────────────────────────────────────────
  // ACTION ITEMS
  // ─────────────────────────────────────────────────────────────────────────────

  const actionItems = [
    ...outOfStockProducts.map((p) => ({
      type: "stock",
      severity: "red" as const,
      id: `oos-${p.id}`,
      data: p,
    })),
    ...lowStockProducts.map((p) => ({
      type: "stock",
      severity: "amber" as const,
      id: `low-${p.id}`,
      data: p,
    })),
    ...zeroStockMaterials.map((m) => ({
      type: "material",
      severity: "red" as const,
      id: `mat0-${m.id}`,
      data: m,
    })),
    ...lowStockMaterials.map((m) => ({
      type: "material",
      severity: "amber" as const,
      id: `matlow-${m.id}`,
      data: m,
    })),
    ...lowStockHealthProjects.map((p) => ({
      type: "coverage",
      severity: (getStockHealthStatus(p.stockHealthMonths) === "red" ? "red" : "amber"),
      id: `coverage-${p.id}`,
      data: p,
    })),
    ...cogsFlagged.map((p) => ({
      type: "pricing",
      severity: "amber" as const,
      id: `cogs-${p.id}`,
      data: p,
    })),
    ...labourFlagged.filter((p) => !cogsFlagged.some((c) => c.id === p.id)).map((p) => ({
      type: "labour",
      severity: "amber" as const,
      id: `labour-${p.id}`,
      data: p,
    })),
    ...idleProjects.map((p) => ({
      type: "idle",
      severity: "amber" as const,
      id: `idle-${p.id}`,
      data: p,
    })),
  ];

  if (loading)
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-white text-sm">Loading insights…</p>
      </div>
    );

  return (
    <div>
      {/* ══ HERO ══ */}
      <section
        className="scalloped-intro bg-[#593026] max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-10"
        aria-label="Insights Hero"
      >
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="hidden sm:flex w-full lg:w-1/5 shrink-0 items-center justify-center">
            <img
              src={Insights_Bunny}
              alt="Illustration of a bunny reviewing insights"
              className="w-1/2 lg:w-full max-h-40 sm:max-h-none object-contain lg:scale-125"
            />
          </div>
          <div className="flex-1 space-y-6 sm:space-y-8 text-center lg:text-left">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Insights</h1>
              <p className="mt-3 text-white/90 text-base leading-relaxed">
                Get a clear view of your business and see what needs to be done. MakerSuite turns your Studio and Marketplace activity into insights so you can track performance, spot issues early, and stay in control of your growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-10">

        {/* ══ ACTION ITEMS ══ */}
        <section aria-label="Action Items">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Action Items</h2>
            {actionItems.length > 0 && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold">
                {actionItems.length}
              </span>
            )}
          </div>

          <p className="text-sm text-white mt-1 mb-4 leading-relaxed">
            All the tasks you need to take action on across your Studio and Marketplace to keep your inventory, production, and pricing healthy.
          </p>

          {actionItems.length === 0 ? (
            <Card className="bg-white border-neutral-200">
              <CardContent className="p-6 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-neutral-700">
                    You're all caught up ╰(*°▽°*)╯ !
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    No urgent actions right now — everything looks healthy across your products, materials, and pricing.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {outOfStockProducts.map((p) => (
                <ActionItem
                  key={`oos-${p.id}`}
                  icon={AlertTriangle}
                  color="red"
                  message={`${p.title} is out of stock`}
                  detail="This product is currently unavailable to customers. Restock to start selling again."
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
                  detail={`${m.quantity} ${m.unit_type} left — below your set threshold. You may need to restock before your next make.`}
                  actionLabel="Go to Studio"
                  onAction={() => navigate("/studio")}
                />
              ))}

              {lowStockHealthProjects.map((p: any) => {
                const status = getStockHealthStatus(p.stockHealthMonths);
                return (
                  <ActionItem
                    key={`stockhealth-${p.id}`}
                    icon={Layers}
                    color={status === "red" ? "red" : "amber"}
                    message={`${p.name} stock health is ${status === "red" ? "critical" : "at risk"}`}
                    detail={`${p.in_stock} units remaining — approx. ${p.stockHealthMonths} month${p.stockHealthMonths === 1 ? "" : "s"} of demand left.`}
                    actionLabel="Log Make"
                    onAction={() => navigate("/studio")}
                  />
                );
              })}

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

              {labourFlagged.filter((p: any) => !cogsFlagged.some((c: any) => c.id === p.id)).map((p: any) => {
                const labourCost = (p.avg_duration_minutes / 60) * hourlyRate;
                const margin = parseFloat(p.product_price) - parseFloat(p.material_cost_per_unit);
                return (
                  <ActionItem
                    key={`labour-${p.id}`}
                    icon={Clock}
                    color="amber"
                    message={`${p.name} doesn't cover your labour at minimum wage`}
                    detail={`After materials, you have €${margin.toFixed(2)} left per unit — but ${formatDuration(p.avg_duration_minutes)} of work costs €${labourCost.toFixed(2)} at €${hourlyRate}/hr.`}
                    actionLabel="Review Pricing"
                    onAction={() => navigate(`/studio/projects/${p.id}`)}
                  />
                );
              })}

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

        {/* ══ OVERVIEW ══ */}
        <section aria-label="Overview">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Overview</h2>
          <p className="text-sm text-white mt-1 mb-4 leading-relaxed">
            A snapshot of your Studio and Marketplace. See what you're making, what you're selling, and how your business is structured right now — all in one place.
          </p>
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
                  aria-label="Go to Studio"
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
                  <Store className="w-4 h-4 text-[#6b3a2e]" aria-hidden="true" />
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
                    onClick={
                      bestSeller
                        ? () => navigate(`/products/${bestSeller.id}/edit`)
                        : undefined
                    }
                  />
                  <StatCard
                    label="Total Revenue"
                    value={calculateTotalRevenue(saleLogs) > 0
                      ? `€${calculateTotalRevenue(saleLogs).toFixed(2)}`
                      : "—"}
                    icon={Euro}
                    sub="all time"
                    highlight={saleLogs.length > 0}
                  />
                </div>
                <Button
                  aria-label="Go to Marketplace"
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

        <WavySeparator />

        {/* ══ PERFORMANCE ══ */}
        <section aria-label="Performance">
          <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Performance</h2>
            <TimeToggle value={timeFilter} onChange={setTimeFilter} />
          </div>

          <p className="text-sm text-white mb-4 leading-relaxed">
            Understand how your business is performing over time. Track sales, production, and efficiency so you can see what's working, what's slowing you down, and where to focus next.
          </p>

          <div className="space-y-4">

            {/* Sales + Production */}
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

            {/* Project Breakdown Table */}
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
                          <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-600">Stock Health</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectInsights
                          .filter((p: any) => p.units_made > 0)
                          .sort((a: any, b: any) => b.units_made - a.units_made)
                          .map((p: any) => {
                            const status = getStockHealthStatus(p.stockHealthMonths);
                            const StatusIcon =
                              status === "green"
                                ? CheckCircle
                                : status === "amber"
                                ? AlertCircle
                                : XCircle;
                            const statusColor =
                              status === "green"
                                ? "text-green-600"
                                : status === "amber"
                                ? "text-amber-500"
                                : "text-red-600";

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
                                  ) : <span className="text-neutral-600">—</span>}
                                </td>
                                <td className="px-4 py-2.5 text-right text-neutral-700">{p.in_stock}</td>
                                <td className="px-4 py-2.5 text-right">
                                  {p.stockHealthMonths !== null ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                                      <span className="text-neutral-700">{p.stockHealthMonths}mo</span>
                                    </div>
                                  ) : (
                                    <span className="text-neutral-600">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-neutral-600 mt-2">
                    Sell-Through = units sold ÷ units made. Stock Health = months of supply at current sales rate.
                  </p>
                </CardContent>
              </Card>
            )}

            {filteredSales.length === 0 && (
              <Card className="bg-white border-neutral-200">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-25" />
                  <p className="text-sm">No sales logged in this period.</p>
                  <Button aria-label="Log a sale" size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => navigate("/marketplace")}>
                    Log a Sale <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* ══ MARKET PERFORMANCE ══ */}
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
                          <td className="px-4 py-2.5 text-right text-neutral-500">{formatDate(m.date)}</td>
                          <td className="px-4 py-2.5 text-right text-neutral-700">{m.market_products?.length ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-neutral-600">Click any row to open the market detail.</p>
              </CardContent>
            </Card>
          </section>
        )}

      </div>
    </div>
  );
}