import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProductTable from "./ProductTable";
import { getCookie } from "../../services/api.ts";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "../../types/product";

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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Etsy" | "MakerSuite" | "Shopify">("All");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const buildUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("page_size", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    if (filter !== "All") params.set("platform", filter);
    return `/api/product-list/?${params.toString()}`;
  };

  async function fetchProducts(page: number) {
    const url = buildUrl(page);
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-CSRFToken": getCookie("csrftoken") ?? "",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.json() as Promise<ApiPage<Product>>;
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchProducts(page)
      .then((data) => {
        setProducts(data.results || []);
        setTotal(data.count || 0);
        setNextUrl(cleanUrl(data.next));
        setPrevUrl(cleanUrl(data.previous));
      })
      .catch((err) => {
        console.error("Failed to load products", err);
        setError("Failed to load products");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, search, filter]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        search.trim().length === 0 ||
        (p.title || "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || (p.platforms ?? []).includes(filter);
      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const handleEdit = (product: Product) => navigate(`/products/${product.id}/edit`);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const shopRes = await fetch("/api/etsy/shop/", {
        credentials: "include",
        headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
      });

      if (shopRes.status === 401 || shopRes.status === 403) {
        toast.error("Your Etsy session has expired — reconnecting...");
        const returnPath = encodeURIComponent(window.location.pathname);
        window.location.href = `/api/etsy/login?return_to=${returnPath}`;
        return;
      }

      if (!shopRes.ok) throw new Error("Failed to fetch shop info");
      const shopData = await shopRes.json();
      const shopId = shopData.shop_id;

      await toast.promise(
        fetch(`/api/etsy/shops/${shopId}/import/`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
        })
          .then(async (res) => {
            if (res.status === 401) {
              toast.error("Your Etsy session has expired — reconnecting...");
              const returnPath = encodeURIComponent(window.location.pathname);
              window.location.href = `/api/etsy/login?return_to=${returnPath}`;
              throw new Error("etsy_token_expired");
            }
            if (!res.ok) throw new Error("Import failed");
            return res.json();
          })
          .then(async (data) => {
            const count = data.imported_listing_ids?.length ?? 0;
            const refreshed = await fetchProducts(page);
            setProducts(refreshed.results || []);
            setTotal(refreshed.count || 0);
            setNextUrl(cleanUrl(refreshed.next));
            setPrevUrl(cleanUrl(refreshed.previous));
            return count;
          }),
        {
          loading: "Refreshing database…",
          success: (count: number) => `Database synced:\n${count} product listings from connected platforms synced`,
          error: (err: Error) => err.message === "etsy_token_expired" ? "" : "Failed to refresh database",
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh database");
    } finally {
      setLoading(false);
    }
  };
  
  const handleAdd = () => navigate("/products/new");

return (
    <div className="max-w-full mx-auto px-10 py-10 space-y-6">
      {/* Title sits on gingham background, outside card */}
      <div>
        <h1 className="text-3xl font-bold text-white">Product Listings</h1>
        <p className="text-white mt-1">Manage and sync your product listings internally and on connected platforms</p>
      </div>

      {/* Card starts at toolbar, matches inventory card */}
      <Card className="bg-[#fdf8f6]">
        <CardContent className="p-6 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading products φ(*￣0￣)...</p>
          ) : error ? (
            <p className="text-sm text-destructive py-8 text-center">{error}</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No products found ( • ᴖ • ｡)</p>
          ) : (
            <>
              <ProductTable
                products={filteredProducts}
                onEdit={handleEdit}
                onRefresh={handleRefresh}
                onCreateNew={handleAdd}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}