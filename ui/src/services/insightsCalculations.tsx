import { SaleLog, Project } from "../types/inventory";

// ─── Revenue & Sales ──────────────────────────────────────────────────────────

export function calculateTotalRevenue(saleLogs: SaleLog[]): number {
  return saleLogs.reduce(
    (sum, log) => sum + (log.sale_price ? parseFloat(log.sale_price) : 0),
    0
  );
}

export function calculateUnitsInWindow(saleLogs: SaleLog[]): number {
  return saleLogs.reduce((sum, log) => sum + log.units_sold, 0);
}

export function calculateAverageSaleValue(
  totalRevenue: number,
  transactionCount: number
): number {
  return transactionCount > 0 ? totalRevenue / transactionCount : 0;
}

export function findBestSeller(
  unitsByProduct: Record<number, number>
): number | undefined {
  return Number(
    Object.entries(unitsByProduct)
      .sort((a, b) => b[1] - a[1])[0]?.[0]
  );
}

export function groupUnitsByProduct(saleLogs: SaleLog[]): Record<number, number> {
  const unitsByProduct: Record<number, number> = {};
  saleLogs.forEach((log) => {
    unitsByProduct[log.product] = (unitsByProduct[log.product] || 0) + log.units_sold;
  });
  return unitsByProduct;
}

export function groupRevenueByProduct(saleLogs: SaleLog[]): Record<number, number> {
  const revenueByProduct: Record<number, number> = {};
  saleLogs.forEach((log) => {
    revenueByProduct[log.product] =
      (revenueByProduct[log.product] || 0) +
      (log.sale_price ? parseFloat(log.sale_price) : 0);
  });
  return revenueByProduct;
}

// ─── Time Filtering ───────────────────────────────────────────────────────────

export type TimeFilter = "month" | "3months" | "all";

export function isInTimeWindow(dateStr: string, filter: TimeFilter): boolean {
  const d = new Date(dateStr);
  const now = new Date();

  if (filter === "all") return true;

  if (filter === "month") {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }

  // 3months
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  return d >= cutoff;
}

// ─── Production Metrics ───────────────────────────────────────────────────────

export function calculateTotalUnitsMade(projects: Project[]): number {
  return projects.reduce((sum, p) => sum + p.units_made, 0);
}

export function calculateMakesInWindow(
  projects: Project[],
  filter: TimeFilter
): number {
  return projects.reduce((sum, p) => {
    const logs = (p.make_logs ?? []).filter((log) =>
      log.date_made ? isInTimeWindow(log.date_made, filter) : filter === "all"
    );
    return sum + logs.reduce((s, log) => s + (log.units_made ?? 0), 0);
  }, 0);
}

export function calculateAverageMakeTime(projects: Project[]): number | null {
  const projectsWithTime = projects.filter((p) => p.avg_duration_minutes != null);

  if (projectsWithTime.length === 0) return null;

  const totalTime = projectsWithTime.reduce(
    (sum, p) => sum + (p.avg_duration_minutes ?? 0),
    0
  );

  return Math.round(totalTime / projectsWithTime.length);
}

export function formatDuration(mins: number | null | undefined): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Sell-Through Rate ────────────────────────────────────────────────────────

export function calculateSellThrough(
  unitsSold: number,
  unitsMade: number
): number | null {
  return unitsMade > 0 ? Math.round((unitsSold / unitsMade) * 100) : null;
}

export function calculateAverageSellThrough(projects: Project[]): number | null {
  const withSellThrough = projects.filter((p) => p.units_made > 0);

  if (withSellThrough.length === 0) return null;

  const totalSellThrough = withSellThrough.reduce((sum, p) => {
    const st = calculateSellThrough(p.units_sold, p.units_made);
    return sum + (st ?? 0);
  }, 0);

  return Math.round(totalSellThrough / withSellThrough.length);
}

// ─── Stock Coverage ───────────────────────────────────────────────────────────

export type StockHealth = "green" | "amber" | "red" | null;

export function calculateAverageMonthlySales(
  unitsByProduct: Record<number, number>,
  saleLogs: SaleLog[]
): Record<number, number> {
  const avgMonthlySales: Record<number, number> = {};

  if (saleLogs.length === 0) return avgMonthlySales;

  const dates = saleLogs.map((s) => new Date(s.sale_date).getTime());
  const earliest = new Date(Math.min(...dates));
  const now = new Date();

  const monthsSpan = Math.max(
    1,
    (now.getFullYear() - earliest.getFullYear()) * 12 +
      (now.getMonth() - earliest.getMonth()) +
      1
  );

  Object.entries(unitsByProduct).forEach(([pid, total]) => {
    avgMonthlySales[Number(pid)] = total / monthsSpan;
  });

  return avgMonthlySales;
}

export function calculateStockCoverage(
  inStock: number,
  avgMonthlySales: number
): number | null {
  return avgMonthlySales > 0 ? +(inStock / avgMonthlySales).toFixed(1) : null;
}

export function getStockHealthStatus(months: number | null | undefined): StockHealth {
  if (months === null || months === undefined) return null;
  if (months >= 2) return "green";
  if (months >= 1) return "amber";
  return "red";
}

// ─── Profit Calculation ───────────────────────────────────────────────────────

export function calculateEstimatedProfit(
  revenue: number,
  materialCostPerUnit: number,
  unitsSold: number
): number {
  return revenue - materialCostPerUnit * unitsSold;
}

// ─── Pricing Warnings (COGS) ──────────────────────────────────────────────────

export function isCOSWarning(
  materialCostPerUnit: string | null | undefined,
  productPrice: string | null | undefined
): boolean {
  if (!materialCostPerUnit || !productPrice) return false;

  return (
    parseFloat(materialCostPerUnit) >= parseFloat(productPrice) * 0.8
  );
}

// ─── Labour Cost Coverage ─────────────────────────────────────────────────────

export function calculateLabourCost(
  durationMinutes: number | null | undefined,
  hourlyRate: number
): number | null {
  if (!durationMinutes) return null;
  return (durationMinutes / 60) * hourlyRate;
}

export function isLabourWarning(
  durationMinutes: number | null | undefined,
  productPrice: string | null | undefined,
  materialCostPerUnit: string | null | undefined,
  hourlyRate: number
): boolean {
  if (!durationMinutes || !productPrice || !materialCostPerUnit) return false;

  const labourCost = (durationMinutes / 60) * hourlyRate;
  const margin = parseFloat(productPrice) - parseFloat(materialCostPerUnit);

  return margin < labourCost;
}

// ─── Idle Projects ────────────────────────────────────────────────────────────

export function isIdleProject(
  makeLogs: Project["make_logs"],
  dayThreshold: number = 30
): boolean {
  if (!makeLogs || makeLogs.length === 0) return false;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dayThreshold);

  const mostRecent = makeLogs
    .map((log) => new Date(log.date_made ?? log.created_at))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return mostRecent < cutoff;
}

// ─── Stock Issues ─────────────────────────────────────────────────────────────

export function getStockStatus(
  quantity: number | null | undefined
): "out-of-stock" | "low-stock" | "in-stock" {
  if (!quantity || quantity === 0) return "out-of-stock";
  if (quantity <= 3) return "low-stock";
  return "in-stock";
}

// ─── Date Formatting ─────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}