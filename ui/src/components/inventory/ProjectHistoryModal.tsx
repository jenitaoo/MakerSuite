import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMakeLogs, getProjectSales } from "../../services/inventoryApi";
import { Project, MakeLog, SaleLog } from "../../types/inventory";

type Props = {
  project: Project;
  onClose: () => void;
};

export default function ProjectHistoryModal({ project, onClose }: Props) {
  const [tab, setTab] = useState<"makes" | "sales">("makes");
  const [makeLogs, setMakeLogs] = useState<MakeLog[]>([]);
  const [saleLogs, setSaleLogs] = useState<SaleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMakeLogs(project.id), getProjectSales(project.id)])
      .then(([makes, sales]) => {
        setMakeLogs(makes.results ?? makes);
        setSaleLogs(sales.results ?? sales);
      })
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoading(false));
  }, [project.id]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>History — {project.name}</DialogTitle>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex rounded-md border border-border overflow-hidden">
          {(["makes", "sales"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setTab(opt)}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === opt
                  ? "bg-[hsl(var(--primary))] text-white"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Makes {opt === "makes" ? `(${makeLogs.length})` : ""}{opt === "sales" ? `Sales (${saleLogs.length})` : ""}
            </button>
          ))}
        </div>

        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-1">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : tab === "makes" ? (
            makeLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No makes logged yet.</p>
            ) : (
              makeLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium">{log.units_made} units made</p>
                    <p className="text-xs text-muted-foreground">{log.date_made ?? "No date"}</p>
                    {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                  </div>
                  <Badge variant="outline" className={log.deducted_materials ? "text-green-600 border-green-300 bg-green-50" : "text-gray-500 border-gray-200 bg-gray-50"}>
                    {log.deducted_materials ? "Materials deducted" : "No deduction"}
                  </Badge>
                </div>
              ))
            )
          ) : (
            saleLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales logged yet.</p>
            ) : (
              saleLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="font-medium">{log.units_sold} units sold</p>
                    <p className="text-xs text-muted-foreground">{log.sale_date}</p>
                    {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                    {log.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {log.tags.map((t) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className={log.source === "etsy" ? "text-blue-600 border-blue-300 bg-blue-50" : "text-gray-500 border-gray-200 bg-gray-50"}>
                    {log.source === "etsy" ? "Etsy" : "Manual"}
                  </Badge>
                </div>
              ))
            )
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}