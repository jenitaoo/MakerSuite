import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { logMake } from "../../services/inventoryApi";
import { Project } from "../../types/inventory";

type Props = {
  project: Project;
  onClose: () => void;
  onLogged: () => void;
};

export default function LogMakeModal({ project, onClose, onLogged }: Props) {
  const [unitsMade, setUnitsMade] = useState(1);
  const [dateMade, setDateMade] = useState(new Date().toISOString().split("T")[0]);
  const [deductMaterials, setDeductMaterials] = useState(false);
  const [makeNotes, setMakeNotes] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [durationMins, setDurationMins] = useState("");
  const [materialOverrides, setMaterialOverrides] = useState<Record<number, string>>(() => {
    const defaults: Record<number, string> = {};
    project.project_materials?.forEach((m) => {
      if (m.quantity_used !== null) {
        defaults[m.id] = m.quantity_used ?? "";
      }
    });
    return defaults;
  });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const hasMaterials = (project.project_materials?.length ?? 0) > 0;

  const getTotalDurationMinutes = (): number | undefined => {
    const h = parseInt(durationHours) || 0;
    const m = parseInt(durationMins) || 0;
    const total = h * 60 + m;
    return total > 0 ? total : undefined;
  };

  const handleSubmit = async () => {
    if (unitsMade < 1) {
      toast.error("Units made must be at least 1");
      return;
    }

    setSaving(true);

    try {
      const material_overrides = deductMaterials
        ? project.project_materials
            ?.map((m) => ({
              material_id: m.material,
              quantity_used: materialOverrides[m.id] ?? m.quantity_used,
            }))
        : undefined;

      await logMake(project.id, {
        units_made: unitsMade,
        date_made: dateMade || undefined,
        deduct_materials: deductMaterials,
        material_overrides,
        duration_minutes: getTotalDurationMinutes(),
        notes: makeNotes || undefined,
      });

      // Invalidate materials cache - forces refetch on next interaction
      queryClient.invalidateQueries({ queryKey: ["materials"] });

      toast.success("Make logged");
      onLogged();
    } catch {
      toast.error("Failed to log make");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Log Make — {project.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Units Made</Label>
            <Input
              type="number"
              min={1}
              value={unitsMade}
              onChange={(e) => setUnitsMade(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
            />
            <p className="text-xs text-muted-foreground">
              Adds to the total and linked product's quantity.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Date Made</Label>
            <Input
              type="date"
              value={dateMade}
              onChange={(e) => setDateMade(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              Duration <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground shrink-0">hrs</span>
              <Input
                type="number"
                min="0"
                max="59"
                placeholder="0"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground shrink-0">mins</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Used to calculate your average make time.
            </p>
          </div>

          {hasMaterials && (
            <>
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={deductMaterials}
                  onCheckedChange={(v) => setDeductMaterials(!!v)}
                  className="mt-0.5"
                />
                <div>
                  <Label className="cursor-pointer">Deduct materials from stock</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Default values are shown using your recipe, but can be overridden.
                  </p>
                </div>
              </div>

              {deductMaterials && (
                <div className="space-y-2 rounded-md border border-border p-3 bg-muted/30">
                  <Label className="text-sm">Materials to Deduct</Label>
                  <div className="space-y-2">
                    {project.project_materials?.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground flex-1 truncate cursor-help">
                              {m.material_name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="w-80 whitespace-normal break-words">
                            <p className="text-sm">{m.material_name}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={m.quantity_used ?? "0"}
                          value={materialOverrides[m.id] ?? m.quantity_used ?? ""}
                          onChange={(e) =>
                            setMaterialOverrides((prev) => ({
                              ...prev,
                              [m.id]: e.target.value,
                            }))
                          }
                          onFocus={(e) => e.target.select()}
                          className="h-8 text-sm w-24 shrink-0"
                        />
                        <span className="text-xs text-muted-foreground w-10 shrink-0">
                          {m.material_unit_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              rows={2}
              value={makeNotes}
              onChange={(e) => setMakeNotes(e.target.value)}
              placeholder="e.g. Used different colour for this batch"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Logging..." : "Log Make"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}