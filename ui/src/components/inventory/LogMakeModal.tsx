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
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [expandBreakdown, setExpandBreakdown] = useState(false);
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

  const getTotalDurationSeconds = getTotalDurationMinutes() ? getTotalDurationMinutes()! * 60 : 0;
  const perUnitSeconds = unitsMade > 0 ? getTotalDurationSeconds / unitsMade : 0;
  const perUnitHours = Math.floor(perUnitSeconds / 3600);
  const perUnitMins = Math.floor((perUnitSeconds % 3600) / 60);

  // Calculate per-unit material deduction
  const getPerUnitDeduction = (materialId: number): number => {
    return parseFloat(materialOverrides[materialId] ?? project.project_materials?.find(m => m.id === materialId)?.quantity_used ?? "0");
  };

  const handleSubmit = async () => {
    if (unitsMade < 1) {
      toast.error("Units made must be at least 1");
      return;
    }

    setSaving(true);

    try {
      // Create individual make logs for each unit
      for (let i = 0; i < unitsMade; i++) {
        const material_overrides = deductMaterials
          ? project.project_materials
              ?.map((m) => ({
                material_id: m.material,
                quantity_used: getPerUnitDeduction(m.id), // Per-unit amount
              }))
          : undefined;

        await logMake(project.id, {
          units_made: 1, // ← Always 1, create multiple logs
          date_made: dateMade || undefined,
          deduct_materials: deductMaterials,
          material_overrides,
          duration_minutes: perUnitSeconds ? Math.floor(perUnitSeconds / 60) : undefined,
          notes: i === 0 ? makeNotes : undefined, // Only add notes to first entry
        });
      }

      // Invalidate materials cache
      queryClient.invalidateQueries({ queryKey: ["materials"] });

      toast.success(`${unitsMade} make${unitsMade !== 1 ? "s" : ""} logged`);
      onLogged();
    } catch {
      toast.error("Failed to log make");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-[#fdf8f6] max-h-[90vh] overflow-y-auto">
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
              Creates {unitsMade} separate make log{unitsMade !== 1 ? "s" : ""}.
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

          {/* ── DURATION SECTION ── */}
          <div className="space-y-2">
            <Label>
              Duration per unit <span className="text-muted-foreground font-normal">(optional)</span>
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
              Applied to each of the {unitsMade} unit{unitsMade !== 1 ? "s" : ""}.
            </p>

            {/* Show duration breakdown */}
            {getTotalDurationMinutes() ? (
              <div className="mt-2 rounded-md bg-blue-50 border border-blue-200 p-2">
                <button
                  onClick={() => setExpandBreakdown(!expandBreakdown)}
                  className="w-full flex items-center justify-between text-xs font-medium text-blue-900 hover:text-blue-700"
                >
                  <span>Duration per unit: {perUnitHours}h {perUnitMins}m</span>
                  {expandBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {expandBreakdown && (
                  <div className="mt-2 space-y-1 border-t border-blue-200 pt-2">
                    {Array.from({ length: unitsMade }).map((_, i) => (
                      <div key={i} className="text-xs text-blue-800 flex items-center justify-between">
                        <span>Make {i + 1}</span>
                        <span className="font-mono">{perUnitHours}h {perUnitMins}m</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* ── MATERIALS SECTION ── */}
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
                    Enter per-unit amounts. Each make deducts these amounts.
                  </p>
                </div>
              </div>

              {deductMaterials && (
                <div className="space-y-3 rounded-md border border-border p-3 bg-muted/30">
                  <Label className="text-sm">Materials per unit</Label>

                  {/* Materials breakdown */}
                  <button
                    onClick={() => setExpandBreakdown(!expandBreakdown)}
                    className="w-full flex items-center justify-between text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white rounded px-2 py-1.5 border border-neutral-200"
                  >
                    <span>Show breakdown for each make</span>
                    {expandBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {expandBreakdown && (
                    <div className="bg-white rounded border border-neutral-200 p-2 space-y-2">
                      {Array.from({ length: unitsMade }).map((_, unitIndex) => (
                        <div key={unitIndex} className="border-b border-neutral-100 pb-2 last:border-0 last:pb-0">
                          <p className="text-xs font-medium text-neutral-700 mb-1">Make {unitIndex + 1}</p>
                          <div className="space-y-1">
                            {project.project_materials?.map((m) => {
                              const perUnit = getPerUnitDeduction(m.id);
                              return (
                                <div key={m.id} className="flex items-center justify-between text-xs text-neutral-600">
                                  <span className="truncate">{m.material_name}</span>
                                  <span className="font-mono shrink-0">
                                    {perUnit.toFixed(2)} {m.material_unit_type}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input fields for per-unit values */}
                  <div className="space-y-3">
                    {project.project_materials?.map((m) => (
                      <div key={m.id} className="space-y-1">
                        <div className="flex items-center gap-2">
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
                            className="h-8 text-sm w-20 shrink-0"
                          />
                          <span className="text-xs text-muted-foreground w-12 shrink-0">
                            {m.material_unit_type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">
                          Total for {unitsMade} make{unitsMade !== 1 ? "s" : ""}: {(getPerUnitDeduction(m.id) * unitsMade).toFixed(2)} {m.material_unit_type}
                        </p>
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
            {saving ? "Logging..." : `Log ${unitsMade} Make${unitsMade !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}