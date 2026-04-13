export type Product = {
  id: number;
  title: string;
  description?: string;
  internal_price: string;
  internal_quantity: number;
  sku?: string;
  image_url?: string;
  images?: { id: number; url: string; rank: number; pushed_to_etsy: boolean }[];
  platforms: string[];
  // Derived from the linked ExternalProductListing.raw.state
  // Populated by ProductListingsPage by joining product with its listing data
  // "active" | "draft" | "inactive" | undefined (no Etsy listing)
  etsy_listing_state?: string;
  linked_project_id: number | null;
  created_at: string;
  updated_at: string;
};