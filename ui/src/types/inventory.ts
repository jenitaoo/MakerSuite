export type RawMaterial = {
  id: number;
  owner: number;
  name: string;
  unit_type: string;        // e.g. "balls", "grams", "metres"
  quantity: string;
  low_stock_threshold: string | null;
  cost_per_unit: string | null;
  source: string | null;
  brand: string | null;
  supplier: string | null;
  sku: string | null;
  notes: string | null;
  custom_fields: Record<string, string>;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
};

export type MakeMaterial = {
  id: number;
  material: number;
  material_name: string;
  material_unit_type: string;   // renamed from material_unit
  quantity_used: string | null;
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
  make: number;
  units_sold: number;
  sale_date: string;
  notes: string | null;
  tags: SaleTag[];
  source: "etsy" | "manual";
  created_at: string;
};

export type Make = {
  id: number;
  owner: number;
  name: string;
  product: number | null;
  product_title: string | null;
  units_produced: number;
  available_units: number;
  units_sold: number;
  date_made: string | null;
  notes: string | null;
  make_materials: MakeMaterial[];
  salelogs: SaleLog[];
  created_at: string;
  updated_at: string;
};

export type InventoryLog = {
  id: number;
  owner: number;
  material: number | null;
  material_name: string | null;
  make: number | null;
  make_name: string | null;
  change_type: "restock" | "make_completion" | "manual_add" | "manual_deduct" | "sale";
  quantity_change: string;
  notes: string | null;
  created_at: string;
};