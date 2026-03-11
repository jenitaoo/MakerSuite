import { useMemo, useState } from "react";
import ProductToolbar from "./ProductToolbar";
import ProductTable, { Product } from "./ProductTable";
import Pagination from "./Pagination";

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Handmade Ring",
    price: 10,
    quantity: 20,
    channel: "Etsy",
    link: "https://etsy.com/listing/123",
    imageUrl: "https://via.placeholder.com/60",
  },
  {
    id: 2,
    name: "Handmade Necklace",
    price: 25,
    quantity: 5,
    channel: "Etsy",
    link: "https://etsy.com/listing/456",
    imageUrl: "https://via.placeholder.com/60",
  },
  // add more mock rows as needed
];

export default function ProductListingsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Etsy">("All");
  const [page, setPage] = useState(1);
  const pageSize = 4;

  const filteredProducts = useMemo(() => {
    return MOCK_PRODUCTS.filter((p) => {
      const matchesSearch =
        search.trim().length === 0 ||
        p.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "All" || p.channel === filter;
      return matchesSearch && matchesFilter;
    });
  }, [search, filter]);

  const total = filteredProducts.length;
  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page]);

  const handleEdit = (product: Product) => {
    // later: open side panel / modal
    console.log("Edit product", product);
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
        <div className="product-listings__actions">
          {/* You already have Sync All / Import / Add in toolbar; 
              keep this empty or add extra actions if needed */}
        </div>
      </div>

      <ProductToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={(value) =>
          setFilter(value === "All" ? "All" : "Etsy")
        }
        onSyncAll={handleSyncAll}
        onImport={handleImport}
        onAdd={handleAdd}
      />

      <ProductTable products={pagedProducts} onEdit={handleEdit} />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </section>
  );
}
