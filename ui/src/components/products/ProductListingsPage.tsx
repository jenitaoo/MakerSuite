import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getCookie } from "../../services/api.ts";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "../../types/product";
import { API_URL } from "../../services/api";

// Lazy load the ProductTable to speed up initial render
const ProductTable = lazy(() => import("./ProductTable"));

type ApiPage<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

const cleanUrl = (url: string | null) => {
  if (!url) return null;
  return url.replace(/^https?:\/\/[^/]+/, "").replace(/"/g, "");
};

export default function ProductListingsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function fetchProducts() {
    const res = await fetch(`${API_URL}/api/product-list/?page_size=200`, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-CSRFToken": getCookie("csrftoken") ?? "",
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json() as Promise<ApiPage<Product>>;
  }

  const loadProducts = () => {
    setLoading(true);
    setError(null);
    fetchProducts()
      .then((data) => setProducts(data.results || []))
      .catch((err) => {
        console.error("Failed to load products", err);
        setError("Failed to load products");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, []);

  const handleEdit = (product: Product) => navigate(`/products/${product.id}/edit`);

  const handleEtsyError = (data: any) => {
    if (data.error === "etsy_token_expired") {
      toast.error("Your Etsy session has expired. Reconnect Etsy in your Profile to continue.", { duration: Infinity });
      return;
    }
    if (data.error === "etsy_not_connected") {
      toast.error("No Etsy account connected. Go to your Profile to connect Etsy.", { duration: Infinity });
      return;
    }
    toast.error(data.error ?? "Failed to sync from Etsy");
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const shopRes = await fetch(`${API_URL}/api/etsy/shop/`, {
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
      });

      if (shopRes.status === 401 || shopRes.status === 403) {
        toast.error("Your Etsy session has expired — reconnecting...", { duration: Infinity });
        window.location.href = `${API_URL}/api/etsy/login?return_to=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (!shopRes.ok) {
        handleEtsyError(await shopRes.json().catch(() => ({})));
        return;
      }

      const { shop_id } = await shopRes.json();

      await toast.promise(
        fetch(`${API_URL}/api/etsy/shops/${shop_id}/import/`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        })
          .then(async (res) => {
            if (res.status === 401 || res.status === 403) {
              window.location.href = `${API_URL}/api/etsy/login?return_to=${encodeURIComponent(window.location.pathname)}`;
              throw new Error("etsy_token_expired");
            }
            if (!res.ok) throw new Error("Import failed");
            const data = await res.json();
            loadProducts();
            return data.imported_listing_ids?.length ?? 0;
          }),
        {
          loading: "Syncing from Etsy…",
          success: (count: number) => `Synced ${count} listings from Etsy`,
          error: (err: Error) => err.message === "etsy_token_expired" ? "" : "Failed to sync from Etsy",
        }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-full mx-auto px-10 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Marketplace</h1>
        <p className="text-white mt-1">Where you sell things</p>
      </div>

      <Card className="bg-[#fdf8f6]">
        <CardContent className="p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading products…</p>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          ) : (
            <Suspense fallback={<div>Loading products...</div>}>
              <ProductTable
                products={products}
                onEdit={handleEdit}
                onRefresh={handleRefresh}
                onCreateNew={() => navigate("/products/new")}
                onDeleted={loadProducts}
                onSaleLogged={loadProducts}
              />
            </Suspense>
          )}
        </CardContent>
      </Card>
    </div>
  );
}