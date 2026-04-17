export type RawMaterial = {
  id: number;
  owner: number;
  name: string;
  unit_type: string;
  quantity: string | null;
  low_stock_threshold: string | null;
  cost_per_unit: string | null;
  source: string | null;
  brand: string | null;
  supplier: string | null;
  sku: string | null;
  notes: string | null;
  tags: string[];
  custom_fields: Record<string, string>;
  photo?: string | null; // write_only, may not be in response
  photo_url: string | null; // SerializerMethodField, always present
  is_low_stock: boolean; // ReadOnlyField
  created_at: string;
  updated_at: string;
};

export type ProjectImage = {
  id: number;
  order: number;
  image_url: string | null; // SerializerMethodField
};

export type ProjectMaterial = {
  id: number;
  material: number;
  quantity_used: string | null;
  material_name: string; // ReadOnlyField (always present)
  material_unit_type: string; // ReadOnlyField (always present)
  material_cost_per_unit: string | null; // ReadOnlyField (can be null)
  material_photo_url: string | null; // SerializerMethodField
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
  product: number;
  units_sold: number;
  sale_date: string;
  sale_price: string | null;
  notes: string | null;
  tags: SaleTag[];
  source: "etsy" | "manual";
  unit_prices?: { unit: number; price: string }[];
  external_id?: string;
  created_at: string;
};

export type Project = {
  id: number;
  owner: number;
  name: string;
  product: number | null;
  product_title: string | null; // SerializerMethodField
  product_price: string | null; // SerializerMethodField
  notes: string | null;
  tags: string[];
  // Computed fields (always present in response)
  units_made: number; // ReadOnlyField
  units_sold: number; // ReadOnlyField
  in_stock: number; // ReadOnlyField
  avg_duration_minutes: number | null; // ReadOnlyField
  material_cost_per_unit: string | null; // SerializerMethodField
  // Relationships (always present, might be empty arrays)
  images: ProjectImage[];
  project_materials: ProjectMaterial[];
  make_logs: MakeLog[];
  created_at: string;
  updated_at: string;
};

export type InventoryLog = {
  id: number;
  owner: number;
  material: number | null;
  material_name: string | null; // SerializerMethodField
  project: number | null;
  project_name: string | null; // SerializerMethodField
  change_type: "restock" | "make" | "manual_add" | "manual_deduct" | "sale";
  quantity_change: string;
  notes: string | null;
  created_at: string;
};