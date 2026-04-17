import { SaleLog, Project, RawMaterial, MakeLog, ProjectMaterial, SaleTag } from "../../types/inventory";

export const createSaleLog = (overrides?: Partial<SaleLog>): SaleLog => ({
  id: 1,
  owner: 1,
  product: 1,
  units_sold: 1,
  sale_price: "10.00",
  sale_date: "2025-01-01",
  notes: null,
  tags: [],
  source: "manual",
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

export const createProject = (overrides?: Partial<Project>): Project => ({
  id: 1,
  owner: 1,
  name: "Test Project",
  product: null,
  product_title: null,
  product_price: null,
  notes: null,
  tags: [],
  units_made: 0,
  units_sold: 0,
  in_stock: 0,
  avg_duration_minutes: null,
  material_cost_per_unit: null,
  images: [],
  project_materials: [],
  make_logs: [],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

export const createRawMaterial = (overrides?: Partial<RawMaterial>): RawMaterial => ({
  id: 1,
  owner: 1,
  name: "Test Material",
  unit_type: "grams",
  quantity: "250.00",
  low_stock_threshold: "50.00",
  cost_per_unit: "0.07",
  source: "Amazon",
  brand: null,
  supplier: null,
  sku: null,
  notes: null,
  tags: [],
  custom_fields: {},
  photo_url: null,
  is_low_stock: false,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

export const createMakeLog = (overrides?: Partial<MakeLog>): MakeLog => ({
  id: 1,
  project: 1,
  units_made: 1,
  date_made: "2025-01-01",
  notes: null,
  deducted_materials: false,
  duration_minutes: 30,
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

export const createProjectMaterial = (overrides?: Partial<ProjectMaterial>): ProjectMaterial => ({
  id: 1,
  material: 1,
  quantity_used: "50.00",
  material_name: "Test Material",
  material_unit_type: "grams",
  material_cost_per_unit: "0.07",
  material_photo_url: null,
  ...overrides,
});

export const createSaleTag = (overrides?: Partial<SaleTag>): SaleTag => ({
  id: 1,
  owner: 1,
  name: "Etsy",
  created_at: "2025-01-01T00:00:00Z",
  ...overrides,
});

// Batch creators for common test scenarios
export const createSaleLogsForProducts = (productIds: number[], unitsEach: number, priceEach: string): SaleLog[] => {
  return productIds.flatMap((productId, idx) =>
    Array.from({ length: unitsEach }, (_, i) =>
      createSaleLog({
        id: idx * unitsEach + i + 1,
        product: productId,
        units_sold: 1,
        sale_price: priceEach,
      })
    )
  );
};

export const createProjectsWithMakes = (count: number, makesEach: number): Project[] => {
  return Array.from({ length: count }, (_, i) => {
    const makeLogs = Array.from({ length: makesEach }, (_, j) =>
      createMakeLog({
        id: i * makesEach + j + 1,
        project: i + 1,
        units_made: 2,
        duration_minutes: 30 + j * 5,
      })
    );

    return createProject({
      id: i + 1,
      name: `Project ${i + 1}`,
      units_made: makeLogs.reduce((sum, log) => sum + log.units_made, 0),
      make_logs: makeLogs,
    });
  });
};