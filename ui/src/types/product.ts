export type Product = {
  id: number;
  title: string;
  description?: string;
  internal_price: string;
  internal_quantity: number;
  sku?: string;
  image_url?: string;
  platforms: string[];
};