import { useState, useEffect } from "react";
import ProjectsTab from "../components/inventory/ProjectsTab";
import MaterialsTab from "../components/inventory/MaterialsTab";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { getMaterials } from "../services/inventoryApi";
import { RawMaterial } from "../types/inventory";

type Tab = "projects" | "materials";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("projects");
  const [lowStockMaterials, setLowStockMaterials] = useState<RawMaterial[]>([]);

  useEffect(() => {
    getMaterials()
      .then((data) => {
        const materials: RawMaterial[] = Array.isArray(data) ? data : data.results ?? [];
        setLowStockMaterials(materials.filter((m) => m.is_low_stock));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-full mx-auto px-10 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Studio</h1>
        <p className="text-white mt-1">Where you make things</p>
      </div>

      {/* Low stock alert banner */}
      {lowStockMaterials.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              {lowStockMaterials.length} material{lowStockMaterials.length !== 1 ? "s" : ""} running low
            </p>
            <p className="text-xs text-amber-700 mt-0.5 truncate">
              {lowStockMaterials.map((m) => m.name).join(", ")}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-100 shrink-0"
            onClick={() => setActiveTab("materials")}
          >
            View Materials
          </Button>
        </div>
      )}

      {/* Main card */}
      <Card className="bg-[#fdf8f6]">
        {/* Tabs */}
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
          {activeTab === "projects"
            ? <ProjectsTab />
            : <MaterialsTab/>
          }
        </CardContent>
      </Card>
    </div>
  );
}