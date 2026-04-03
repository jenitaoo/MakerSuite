import { useEffect, useState } from "react";
import { getCookie } from "../services/api";

export type ProductImage = {
  id: number;
  url: string;
  rank: number;
  pushed_to_etsy: boolean;
  created_at: string;
};

export type ProductDetail = {
  id: number;
  owner: number;
  title: string;
  description: string | null;
  sku: string | null;
  internal_price: string;
  internal_quantity: number;
  image_url: string | null;   // primary image, for list views
  images: ProductImage[];     // all internal images
  platforms: string[];
  created_at: string;
  updated_at: string;
};

export type EtsyRaw = {
  title: string;
  description: string;
  price: { amount: number; divisor: number; currency_code: string };
  quantity: number;
  skus: string[];
  tags: string[];
  materials: string[];
  who_made: string;
  when_made: string;
  should_auto_renew: boolean;
  is_taxable: boolean;
  listing_type: string;
  state: string;
  url: string;
  views: number;
  num_favorers: number;
  listing_id: number;
  shop_id: number;
  images: {
    rank: number;
    url_570xN: string;
    url_fullxfull: string;
    alt_text: string | null;
    listing_image_id: number;
  }[];
  is_personalizable: boolean;
  personalization_instructions: string | null;
  personalization_char_count_max: number | null;
  personalization_is_required: boolean;
  processing_min: number;
  processing_max: number;
  shipping_profile_id: number;
  return_policy_id: number;
  taxonomy_id: number;
  featured_rank: number;
  language: string;
  readiness_state_id?: number;
};

export type ExternalListing = {
  id: number;
  product: number;
  owner: number;
  platform: string;
  platform_listing_id: string;
  listing_title: string;
  listing_description: string;
  listing_price: string;
  listing_currency: string;
  listing_quantity: number;
  listing_image_url: string | null;
  raw: EtsyRaw;
  last_synced: string;
  etsy_tags: string[];
  etsy_materials: string[];
  etsy_who_made: string;
  etsy_when_made: string;
  etsy_should_auto_renew: boolean;
  etsy_is_taxable: boolean;
  etsy_listing_type: string;
};

type UseProductWithListingsResult = {
  product: ProductDetail | null;
  externalListings: ExternalListing[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useProductWithListings(id: string | undefined): UseProductWithListingsResult {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [externalListings, setExternalListings] = useState<ExternalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/products/${id}/with_listings/`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-CSRFToken": getCookie("csrftoken") ?? "",
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        setProduct(data.product);
        setExternalListings(data.external_listings);
      })
      .catch((err) => {
        console.error("Failed to load product", err);
        setError("Failed to load product");
      })
      .finally(() => setLoading(false));
  }, [id, tick]);

  return {
    product,
    externalListings,
    loading,
    error,
    refetch: () => setTick((t) => t + 1),
  };
}