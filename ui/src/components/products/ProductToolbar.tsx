/*import React from "react";*/

type ProductToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
};

export default function ProductToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onRefresh,
  onAdd,
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
          <button
            type="button"
            className="product-toolbar__filter-button"
            onClick={() => onFilterChange(filter === "All" ? "Etsy" : "All")}
          >
            Filter: {filter}
            <span className="product-toolbar__filter-caret">▼</span>
          </button>
        </div>
      </div>

      <div className="product-toolbar__right">
        <button type="button" className="btn btn--secondary" onClick={onRefresh}>
          Refresh
        </button>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          Add
        </button>
      </div>
    </div>
  );
}
