/*import React from "react";*/

type ProductToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: "All" | "Etsy" | "MakerSuite" | "Shopify";
  onFilterChange: (value: "All" | "Etsy" | "MakerSuite" | "Shopify") => void;
  onRefresh: () => void;
  onCreateNewProduct: () => void;
};

export default function ProductToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onRefresh,
  onCreateNewProduct,
}: ProductToolbarProps) {
  return (
    <div className="product-toolbar">
      <div className="product-toolbar__left">
        <div className="product-toolbar__search">
          <span className="product-toolbar__search-icon">🔍</span>
          <input
            type="text"
            placeholder="Name or Description"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="product-toolbar__filter">
          <select
            className="product-toolbar__filter-select"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value as "All" | "Etsy" | "MakerSuite" | "Shopify")}
          >
            <option value="All">All</option>
            <option value="Etsy">Etsy</option>
            <option value="MakerSuite">MakerSuite</option>
            <option value="Shopify" disabled>Shopify (Disabled)</option>
          </select>
        </div>
      </div>

      <div className="product-toolbar__right">
        <button type="button" className="btn btn--secondary" disabled>
          Sync from Shopify
        </button>
        <button type="button" className="btn btn--secondary" onClick={onRefresh}>
          Sync From Etsy
        </button>
        <button type="button" className="btn btn--primary" onClick={onCreateNewProduct}>
          Create New Product
        </button>
      </div>
    </div>
  );
}
