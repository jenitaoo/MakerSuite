import { useState } from "react";
import ProjectsTab from "../components/inventory/ProjectsTab";
import MaterialsTab from "../components/inventory/MaterialsTab";
import "../styles/inventory.css";

type Tab = "projects" | "materials";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("projects");

  return (
    <div className="inventory-page">
      <div className="inventory-page__header">
        <h1>Inventory</h1>
      </div>

      <div className="inventory-page__tabs">
      <button
        type="button"
        className={`inventory-page__tab ${activeTab === "projects" ? "inventory-page__tab--active" : ""}`}
        onClick={() => setActiveTab("projects")}
      >
        Projects
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
        {activeTab === "projects" ? <ProjectsTab /> : <MaterialsTab />}
      </div>
    </div>
  );
}