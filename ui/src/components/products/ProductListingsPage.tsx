import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ProductToolbar from "./ProductToolbar";
import ProductTable from "./ProductTable";
import { Product } from "./ProductRow";
import Pagination from "./Pagination";
import { getCookie } from "../../services/api.ts";

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
  const [pageSize] = useState(20); // matches backend page_size
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Build query URL for page and optional search/filter
  const buildUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("page_size", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    if (filter !== "All") params.set("platform", filter);
    // endpoint: /api/product-list/
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


  // client-side filtering for any fields not supported by backend search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        search.trim().length === 0 ||
        (p.title || "").toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || (p.platforms ?? []).includes(filter);
      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const handleEdit = (product: Product) => {
    navigate(`/products/${product.id}/edit`);
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Step 1 — get shop_id
      const shopRes = await fetch("/api/etsy/shop/", {
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
      });
      if (!shopRes.ok) throw new Error("Failed to fetch shop info");
      const shopData = await shopRes.json();
      const shopId = shopData.shop_id;

      // Step 2 — trigger import with a promise toast
      await toast.promise(
        fetch(`/api/etsy/shops/${shopId}/import/`, {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "X-CSRFToken": getCookie("csrftoken") ?? "",
          },
        })
          .then(async (res) => {
            if (!res.ok) throw new Error("Import failed");
            return res.json();
          })
          .then(async (data) => {
            const count = data.imported_listing_ids?.length ?? 0;

            // Step 3 — refresh table
            const refreshed = await fetchProducts(page);
            setProducts(refreshed.results || []);
            setTotal(refreshed.count || 0);
            setNextUrl(cleanUrl(refreshed.next));
            setPrevUrl(cleanUrl(refreshed.previous));

            return count;
          }),
        {
          loading: "Refreshing database…",
          success: (count: number) => `Database refreshed: ${count} listings synced`,
          error: "Failed to refresh database",
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to refresh database");
    } finally {
      setLoading(false);
    }
  };


  const handleAdd = () => {
    navigate("/products/new");
  };

  return (
    <section className="product-listings">
      <div className="product-listings__header">
        <h1>Product Listings</h1>
        <div className="product-listings__actions" />
      </div>

      <ProductToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={(value) => setFilter(value as "All" | "Etsy" | "MakerSuite" | "Shopify")}
        onRefresh={handleRefresh}
        onCreateNewProduct={handleAdd}
      />

      {loading ? (
        <div>Loading products…</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : filteredProducts.length === 0 ? (
        <div>No products found ( • ᴖ • ｡)</div>
      ) : (
        <>
          <ProductTable products={filteredProducts} onEdit={handleEdit} />

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => setPage(p)}
            nextUrl={nextUrl}
            prevUrl={prevUrl}
          />
        </>
      )}
    </section>
  );
}
