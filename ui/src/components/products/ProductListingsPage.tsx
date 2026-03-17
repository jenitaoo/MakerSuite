import { useEffect, useMemo, useState } from "react";
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
  const [filter, setFilter] = useState<"All" | "Etsy">("All");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20); // matches backend page_size
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build query URL for page and optional search/filter
  const buildUrl = (pageNum: number) => {
    const params = new URLSearchParams();
    params.set("page", String(pageNum));
    params.set("page_size", String(pageSize));
    if (search.trim()) params.set("search", search.trim());
    if (filter !== "All") params.set("channel", filter);
    // endpoint: /api/product-list/
    return `/api/product-list/?${params.toString()}`;
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = buildUrl(page);
    fetch(url, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "X-CSRFToken": getCookie("csrftoken") ?? "",
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status} ${res.statusText} ${text}`);
        }
        return res.json() as Promise<ApiPage<Product>>;
      })
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
      const matchesFilter = filter === "All" || (p as any).channel === filter;
      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const handleEdit = (product: Product) => {
    // navigate to editor or open panel
    window.location.href = `/products/${product.id}/edit`;
  };

  const handleSyncAll = () => {
    console.log("Sync all clicked");
  };

  const handleImport = () => {
    console.log("Import clicked");
  };

  const handleAdd = () => {
    console.log("Add clicked");
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
        onFilterChange={(value) => setFilter(value === "All" ? "All" : "Etsy")}
        onSyncAll={handleSyncAll}
        onImport={handleImport}
        onAdd={handleAdd}
      />

      {loading ? (
        <div>Loading products…</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : filteredProducts.length === 0 ? (
        <div>No products found</div>
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
