import { useState } from "react";
import MakesTab from "../components/inventory/MakesTab";
import MaterialsTab from "../components/inventory/MaterialsTab";
import "../styles/inventory.css";

type Tab = "makes" | "materials";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("makes");

  return (
    <div className="inventory-page">
      <div className="inventory-page__header">
        <h1>Inventory</h1>
      </div>

      <div className="inventory-page__tabs">
        <button
          type="button"
          className={`inventory-page__tab ${activeTab === "makes" ? "inventory-page__tab--active" : ""}`}
          onClick={() => setActiveTab("makes")}
        >
          Makes
        </button>
        <button
          type="button"
          className={`inventory-page__tab ${activeTab === "materials" ? "inventory-page__tab--active" : ""}`}
          onClick={() => setActiveTab("materials")}
        >
          Raw Materials
        </button>
      </div>

      <div className="inventory-page__content">
        {activeTab === "makes" ? <MakesTab /> : <MaterialsTab />}
      </div>
    </div>
  );
}