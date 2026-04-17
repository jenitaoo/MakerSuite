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
  isInTimeWindow as isInTimeWindowHelper,
} from "../insightsCalculations";
import {
  createSaleLog,
  createProject,
  createRawMaterial,
  createMakeLog,
  createProjectMaterial,
  createSaleLogsForProducts,
  createProjectsWithMakes,
} from "./testHelpers";

// ─── FR-INS-2: Revenue & Sales Metrics ─────────────────────────────────────

describe("FR-INS-2: Calculate business overview metrics", () => {

  describe("calculateTotalRevenue", () => {
    it("should sum all sale prices", () => {
      const saleLogs = [
        createSaleLog({ id: 1, sale_price: "10.50", sale_date: "2025-01-01" }),
        createSaleLog({ id: 2, sale_price: "25.00", sale_date: "2025-01-02" }),
        createSaleLog({ id: 3, sale_price: "15.75", sale_date: "2025-01-03" }),
      ];

      const result = calculateTotalRevenue(saleLogs);
      expect(result).toBeCloseTo(51.25, 2);
    });

    it("should handle null sale prices", () => {
      const saleLogs = [
        createSaleLog({ sale_price: "10.00" }),
        createSaleLog({ sale_price: null }),
      ];

      const result = calculateTotalRevenue(saleLogs);
      expect(result).toBe(10.00);
    });

    it("should return 0 for empty sales", () => {
      const result = calculateTotalRevenue([]);
      expect(result).toBe(0);
    });
  });

  describe("calculateUnitsInWindow", () => {
    it("should sum units sold", () => {
      const saleLogs = [
        createSaleLog({ units_sold: 5 }),
        createSaleLog({ id: 2, units_sold: 3 }),
      ];

      const result = calculateUnitsInWindow(saleLogs);
      expect(result).toBe(8);
    });

    it("should return 0 for no sales", () => {
      const result = calculateUnitsInWindow([]);
      expect(result).toBe(0);
    });
  });

  describe("calculateAverageSaleValue", () => {
    it("should calculate revenue / transaction count", () => {
      const result = calculateAverageSaleValue(100, 4);
      expect(result).toBe(25);
    });

    it("should return 0 if no transactions", () => {
      const result = calculateAverageSaleValue(100, 0);
      expect(result).toBe(0);
    });
  });

  describe("findBestSeller", () => {
    it("should return product with highest units sold", () => {
      const unitsByProduct = { 1: 5, 2: 15, 3: 8 };
      const result = findBestSeller(unitsByProduct);
      expect(result).toBe(2);
    });

    it("should return undefined if no products", () => {
      const result = findBestSeller({});
      expect(result).toBeNaN();
    });
  });

  describe("groupUnitsByProduct", () => {
    it("should group units by product ID", () => {
      const saleLogs = [
        createSaleLog({ product: 1, units_sold: 5 }),
        createSaleLog({ id: 2, product: 2, units_sold: 3 }),
        createSaleLog({ id: 3, product: 1, units_sold: 2 }),
      ];

      const result = groupUnitsByProduct(saleLogs);
      expect(result).toEqual({ 1: 7, 2: 3 });
    });

    it("should return empty object for no sales", () => {
      const result = groupUnitsByProduct([]);
      expect(result).toEqual({});
    });
  });

  describe("groupRevenueByProduct", () => {
    it("should sum revenue by product ID", () => {
      const saleLogs = [
        createSaleLog({ product: 1, sale_price: "10.00" }),
        createSaleLog({ id: 2, product: 2, sale_price: "20.00" }),
        createSaleLog({ id: 3, product: 1, sale_price: "15.00" }),
      ];

      const result = groupRevenueByProduct(saleLogs);
      expect(result).toEqual({ 1: 25, 2: 20 });
    });
  });
});

// ─── FR-INS-3: Time Filtering ──────────────────────────────────────────────

describe("FR-INS-3: Filter sales by time window", () => {

  describe("isInTimeWindow", () => {
    it("should include all dates for 'all' filter", () => {
      expect(isInTimeWindowHelper("2020-01-01", "all")).toBe(true);
      expect(isInTimeWindowHelper("2025-12-31", "all")).toBe(true);
    });

    it("should filter current month only", () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
      const lastMonth = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}-15`;

      expect(isInTimeWindowHelper(currentMonth, "month")).toBe(true);
      expect(isInTimeWindowHelper(lastMonth, "month")).toBe(false);
    });

    it("should filter last 3 months", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const oldDate = new Date();
      oldDate.setMonth(oldDate.getMonth() - 4);

      expect(isInTimeWindowHelper(recentDate.toISOString().split('T')[0], "3months")).toBe(true);
      expect(isInTimeWindowHelper(oldDate.toISOString().split('T')[0], "3months")).toBe(false);
    });
  });
});

// ─── FR-INS-4: Sell-Through Rate & Stock Coverage ───────────────────────────

describe("FR-INS-4: Calculate sell-through rate and stock coverage", () => {

  describe("calculateSellThrough", () => {
    it("should calculate units sold / units made as percentage", () => {
      const result = calculateSellThrough(15, 20);
      expect(result).toBe(75);
    });

    it("should return null if no units made", () => {
      const result = calculateSellThrough(0, 0);
      expect(result).toBeNull();
    });

    it("should handle 100% sell-through", () => {
      const result = calculateSellThrough(5, 5);
      expect(result).toBe(100);
    });

    it("should handle 0% sell-through", () => {
      const result = calculateSellThrough(0, 10);
      expect(result).toBe(0);
    });
  });

  describe("calculateAverageSellThrough", () => {
    it("should calculate average sell-through across projects", () => {
      const projects = [
        createProject({ units_made: 20, units_sold: 15 }),
        createProject({ id: 2, units_made: 10, units_sold: 5 }),
      ];

      const result = calculateAverageSellThrough(projects);
      expect(result).toBe(63);
    });

    it("should return null if no projects", () => {
      const result = calculateAverageSellThrough([]);
      expect(result).toBeNull();
    });
  });

  describe("calculateAverageMonthlySales", () => {
    it("should calculate average monthly sales per product", () => {
      const unitsByProduct = { 1: 24, 2: 12 };
      const saleLogs = [
        createSaleLog({ product: 1, sale_date: "2023-01-01" }),
        createSaleLog({ id: 2, product: 1, sale_date: "2025-12-01" }),
      ];

      const result = calculateAverageMonthlySales(unitsByProduct, saleLogs);
      expect(result[1]).toBeGreaterThan(0);
      expect(result[2]).toBeGreaterThan(0);
    });

    it("should return empty object for no sales", () => {
      const result = calculateAverageMonthlySales({ 1: 10 }, []);
      expect(result).toEqual({});
    });
  });

  describe("calculateStockCoverage", () => {
    it("should calculate months of supply", () => {
      const result = calculateStockCoverage(15, 5);
      expect(result).toBe(3.0);
    });

    it("should return null if no average monthly sales", () => {
      const result = calculateStockCoverage(10, 0);
      expect(result).toBeNull();
    });
  });

  describe("getStockHealthStatus", () => {
    it("should return green for >= 2 months", () => {
      expect(getStockHealthStatus(3)).toBe("green");
      expect(getStockHealthStatus(2)).toBe("green");
    });

    it("should return amber for 1-2 months", () => {
      expect(getStockHealthStatus(1.5)).toBe("amber");
      expect(getStockHealthStatus(1)).toBe("amber");
    });

    it("should return red for < 1 month", () => {
      expect(getStockHealthStatus(0.5)).toBe("red");
      expect(getStockHealthStatus(0)).toBe("red");
    });

    it("should return null for null input", () => {
      expect(getStockHealthStatus(null)).toBeNull();
      expect(getStockHealthStatus(undefined)).toBeNull();
    });
  });
});

// ─── FR-INS-5: Profit Calculation ──────────────────────────────────────────

describe("FR-INS-5: Calculate estimated profit per product", () => {

  describe("calculateEstimatedProfit", () => {
    it("should calculate profit = revenue - (material cost × units)", () => {
      const result = calculateEstimatedProfit(35.00, 2.50, 10);
      expect(result).toBe(10.00);
    });

    it("should handle negative profit (loss)", () => {
      const result = calculateEstimatedProfit(20.00, 5.00, 5);
      expect(result).toBe(-5.00);
    });

    it("should return 0 if no units sold", () => {
      const result = calculateEstimatedProfit(0, 2.50, 0);
      expect(result).toBe(0);
    });
  });
});

// ─── FR-INS-1: Action Items - Pricing Warnings ────────────────────────────

describe("FR-INS-1: Identify underpriced projects (COGS >= 80% of price)", () => {

  describe("isCOSWarning", () => {
    it("should flag if material cost >= 80% of price", () => {
      expect(isCOSWarning("8.00", "10.00")).toBe(true);
      expect(isCOSWarning("8.50", "10.00")).toBe(true);
    });

    it("should not flag if material cost < 80% of price", () => {
      expect(isCOSWarning("7.50", "10.00")).toBe(false);
      expect(isCOSWarning("7.99", "10.00")).toBe(false);
    });

    it("should handle null values", () => {
      expect(isCOSWarning(null, "10.00")).toBe(false);
      expect(isCOSWarning("8.00", null)).toBe(false);
      expect(isCOSWarning(null, null)).toBe(false);
    });
  });
});

// ─── FR-INS-1: Action Items - Labour Cost Coverage ────────────────────────

describe("FR-INS-1: Identify projects not covering labour cost", () => {

  describe("isLabourWarning", () => {
    it("should flag if profit margin < labour cost", () => {
      expect(isLabourWarning(120, "25.00", "10.00", 14.15)).toBe(true);
    });

    it("should not flag if profit margin >= labour cost", () => {
      expect(isLabourWarning(30, "25.00", "10.00", 14.15)).toBe(false);
    });

    it("should handle null values", () => {
      expect(isLabourWarning(null, "25.00", "10.00", 14.15)).toBe(false);
      expect(isLabourWarning(60, null, "10.00", 14.15)).toBe(false);
      expect(isLabourWarning(60, "25.00", null, 14.15)).toBe(false);
    });
  });
});

// ─── FR-INS-1: Action Items - Idle Projects ───────────────────────────────

describe("FR-INS-1: Identify idle projects (30+ days no makes)", () => {

  describe("isIdleProject", () => {
    it("should flag projects with no makes in 30+ days", () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const makeLogs = [
        createMakeLog({ date_made: thirtyOneDaysAgo.toISOString().split('T')[0] }),
      ];

      expect(isIdleProject(makeLogs)).toBe(true);
    });

    it("should not flag recent projects", () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const makeLogs = [
        createMakeLog({ date_made: tenDaysAgo.toISOString().split('T')[0] }),
      ];

      expect(isIdleProject(makeLogs)).toBe(false);
    });

    it("should return false for no make logs", () => {
      expect(isIdleProject(null)).toBe(false);
      expect(isIdleProject([])).toBe(false);
    });

    it("should support custom day threshold", () => {
      const sixtyOneDaysAgo = new Date();
      sixtyOneDaysAgo.setDate(sixtyOneDaysAgo.getDate() - 61);

      const makeLogs = [
        createMakeLog({ date_made: sixtyOneDaysAgo.toISOString().split('T')[0] }),
      ];

      expect(isIdleProject(makeLogs, 30)).toBe(true);
      expect(isIdleProject(makeLogs, 90)).toBe(false);
    });
  });
});

// ─── Production Metrics ────────────────────────────────────────────────────

describe("FR-PROJ-7: Calculate project statistics", () => {

  describe("calculateTotalUnitsMade", () => {
    it("should sum units made across all projects", () => {
      const projects = createProjectsWithMakes(3, 2);
      const result = calculateTotalUnitsMade(projects);
      expect(result).toBe(12); // 3 projects × 2 makes × 2 units each
    });

    it("should return 0 for no projects", () => {
      expect(calculateTotalUnitsMade([])).toBe(0);
    });
  });

  describe("calculateAverageMakeTime", () => {
    it("should calculate average duration across projects", () => {
      const projects = [
        createProject({ avg_duration_minutes: 30 }),
        createProject({ id: 2, avg_duration_minutes: 60 }),
        createProject({ id: 3, avg_duration_minutes: 90 }),
      ];

      const result = calculateAverageMakeTime(projects);
      expect(result).toBe(60);
    });

    it("should return null if no projects with time data", () => {
      const projects = [createProject({ avg_duration_minutes: null })];
      const result = calculateAverageMakeTime(projects);
      expect(result).toBeNull();
    });
  });

  describe("formatDuration", () => {
    it("should format minutes to human readable", () => {
      expect(formatDuration(30)).toBe("30m");
      expect(formatDuration(60)).toBe("1h");
      expect(formatDuration(90)).toBe("1h 30m");
      expect(formatDuration(120)).toBe("2h");
    });

    it("should return dash for null/undefined", () => {
      expect(formatDuration(null)).toBe("—");
      expect(formatDuration(undefined)).toBe("—");
    });
  });

  describe("calculateMakesInWindow", () => {
    it("should sum units made in time window", () => {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;

      const projects = [
        createProject({
          make_logs: [createMakeLog({ date_made: currentMonth, units_made: 5 })],
        }),
      ];

      const result = calculateMakesInWindow(projects, "month");
      expect(result).toBe(5);
    });
  });
});

// ─── Utility Functions ─────────────────────────────────────────────────────

describe("Utility Functions", () => {

  describe("formatDate", () => {
    it("should format date to locale string", () => {
      const result = formatDate("2025-01-15");
      expect(result).toMatch(/15.*Jan.*2025/);
    });

    it("should return dash for invalid date", () => {
      expect(formatDate("invalid")).toBe("—");
    });
  });

  describe("getStockStatus", () => {
    it("should return out-of-stock for 0 or null", () => {
      expect(getStockStatus(0)).toBe("out-of-stock");
      expect(getStockStatus(null)).toBe("out-of-stock");
    });

    it("should return low-stock for <= 3", () => {
      expect(getStockStatus(1)).toBe("low-stock");
      expect(getStockStatus(3)).toBe("low-stock");
    });

    it("should return in-stock for > 3", () => {
      expect(getStockStatus(4)).toBe("in-stock");
      expect(getStockStatus(100)).toBe("in-stock");
    });
  });
});