import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getMakeLogs } from "../../services/inventoryApi";
import { Project, MakeLog } from "../../types/inventory";

type Props = {
  project: Project;
  onClose: () => void;
};

export default function MakeHistoryModal({ project, onClose }: Props) {
  const [makeLogs, setMakeLogs] = useState<MakeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMakeLogs(project.id)
      .then((data) => setMakeLogs(data.results ?? data))
      .catch(() => toast.error("Failed to load history"))
      .finally(() => setLoading(false));
  }, [project.id]);

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return null;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Make History — {project.name}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-1">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : makeLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No makes logged yet.</p>
          ) : (
            makeLogs.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div className="space-y-0.5">
                  <p className="font-medium">{log.units_made} units made</p>
                  <p className="text-xs text-muted-foreground">{log.date_made ?? "No date"}</p>
                  {formatDuration(log.duration_minutes) && (
                    <p className="text-xs text-muted-foreground">⏱ {formatDuration(log.duration_minutes)}</p>
                  )}
                  {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                </div>
                <Badge variant="outline" className={log.deducted_materials ? "text-green-600 border-green-300 bg-green-50" : "text-gray-500 border-gray-200 bg-gray-50"}>
                  {log.deducted_materials ? "Materials deducted" : "No deduction"}
                </Badge>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}