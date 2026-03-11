/*import React from "react";*/

type ProductToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  onSyncAll: () => void;
  onImport: () => void;
  onAdd: () => void;
};

export default function ProductToolbar({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onSyncAll,
  onImport,
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
        <button type="button" className="btn btn--secondary" onClick={onSyncAll}>
          Refresh Database
        </button>
        <button type="button" className="btn btn--secondary" onClick={onImport}>
          Import
        </button>
        <button type="button" className="btn btn--primary" onClick={onAdd}>
          Add
        </button>
      </div>
    </div>
  );
}
