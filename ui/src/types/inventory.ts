export type RawMaterial = {
  id: number;
  owner: number;
  name: string;
  unit_type: string;
  quantity: string;
  low_stock_threshold: string | null;
  cost_per_unit: string | null;
  source: string | null;
  brand: string | null;
  supplier: string | null;
  tags?: string[];
  sku: string | null;
  notes: string | null;
  custom_fields: Record<string, string>;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
};

export type ProjectMaterial = {
  id: number;
  material: number;
  material_name: string;
  material_unit_type: string;
  quantity_used: string | null;
  material_cost_per_unit: string | null;
  material_photo_url: string | null
};

export type MakeLog = {
  id: number;
  project: number;
  units_made: number;
  date_made: string | null;
  notes: string | null;
  deducted_materials: boolean;
  duration_minutes: number | null;
  created_at: string;
};

export type SaleTag = {
  id: number;
  owner: number;
  name: string;
  created_at: string;
};

export type SaleLog = {
  id: number;
  owner: number;
  project: number;
  units_sold: number;
  sale_date: string;
  notes: string | null;
  tags: SaleTag[];
  source: "etsy" | "manual";
  created_at: string;
};

export type Project = {
  id: number;
  owner: number;
  name: string;
  product: number | null;
  product_title: string | null;
  units_made: number;
  units_sold: number;
  in_stock: number;
  notes: string | null;
  project_materials: ProjectMaterial[];
  make_logs: MakeLog[];
  sale_logs: SaleLog[];
  created_at: string;
  updated_at: string;
  product_price: string | null;
  avg_duration_minutes?: number | null;
  material_cost_per_unit?: string | null;
};

export type InventoryLog = {
  id: number;
  owner: number;
  material: number | null;
  material_name: string | null;
  project: number | null;
  project_name: string | null;
  change_type: "restock" | "make" | "manual_add" | "manual_deduct" | "sale";
  quantity_change: string;
  notes: string | null;
  created_at: string;
};