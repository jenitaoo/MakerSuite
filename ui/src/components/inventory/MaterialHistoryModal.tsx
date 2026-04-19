import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getMaterialLogs } from "../../services/inventoryApi";
import { RawMaterial, InventoryLog } from "../../types/inventory";

type Props = {
  material: RawMaterial;
  onClose: () => void;
};

const badgeStyle: Record<string, string> = {
  restock: "text-green-600 border-green-300 bg-green-50",
  manual_add: "text-green-600 border-green-300 bg-green-50",
  manual_deduct: "text-red-600 border-red-300 bg-red-50",
  make: "text-blue-600 border-blue-300 bg-blue-50",
  sale: "text-amber-600 border-amber-300 bg-amber-50",
};

const changeLabel: Record<string, string> = {
  restock: "Restock",
  manual_add: "Manual Add",
  manual_deduct: "Deduct",
  make: "Make",
  sale: "Sale",
};

export default function MaterialHistoryModal({ material, onClose }: Props) {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaterialLogs(material.id)
      .then(setLogs)
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoading(false));
  }, [material.id]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>History — {material.name}</DialogTitle>
        </DialogHeader>

        <div className="py-2 max-h-[60vh] overflow-y-auto space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No history yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={badgeStyle[log.change_type] ?? ""}>
                      {changeLabel[log.change_type] ?? log.change_type}
                    </Badge>
                    {log.project_name && (
                      <span className="text-muted-foreground text-xs">via {log.project_name}</span>
                    )}
                  </div>
                  {log.notes && <p className="text-muted-foreground text-xs">{log.notes}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                </div>
                <span className={`font-medium whitespace-nowrap ${Number(log.quantity_change) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {Number(log.quantity_change) >= 0 ? "+" : ""}{log.quantity_change} {material.unit_type}
                </span>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button aria-label="Close" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}