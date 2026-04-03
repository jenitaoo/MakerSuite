import { useState } from "react";
import ProjectsTab from "../components/inventory/ProjectsTab";
import MaterialsTab from "../components/inventory/MaterialsTab";
import { Card, CardContent } from "@/components/ui/card";

type Tab = "projects" | "materials";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("projects");

  return (
    <div className="max-w-full mx-auto px-10 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Inventory</h1>
        <p className="text-white mt-1">Manage your projects and raw materials</p>
      </div>

      <Card className="bg-[#fdf8f6]">
        {/* Tabs inside the card header area */}
        <div className="px-6 pt-6 border-b border-border">
          <div className="flex gap-1">
            {(["projects", "materials"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-[hsl(var(--primary))] text-[hsl(var(--foreground))]"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tab === "projects" ? "Projects" : "Raw Materials"}
              </button>
            ))}
          </div>
        </div>

        <CardContent className="p-6">
          {activeTab === "projects" ? <ProjectsTab /> : <MaterialsTab />}
        </CardContent>
      </Card>
    </div>
  );
}