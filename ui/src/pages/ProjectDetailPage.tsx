import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getProject, getMakeLogs, getProjectSales,
  getProjectMaterials, removeProjectMaterial, getMaterials,
} from "../services/inventoryApi";
import { Project, SaleLog, MakeLog, ProjectMaterial, RawMaterial } from "../types/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import ProjectLogActionModal from "../components/inventory/ProjectLogActionModal";
import ProjectMaterialsModal from "../components/inventory/ProjectMaterialsModal";
import { AuthContext } from "../context/AuthContext";
import { getCookie } from "../services/api";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [project, setProject] = useState<Project | null>(null);
  const [sales, setSales] = useState<SaleLog[]>([]);
  const [makeLogs, setMakeLogs] = useState<MakeLog[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogAction, setShowLogAction] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<number[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Pricing calculator
  const [hourlyRate, setHourlyRate] = useState(auth?.user?.hourly_rate ?? "14.15");
  const [savingRate, setSavingRate] = useState(false);

  const fetchAll = async () => {
    if (!id) return;
    try {
      const [projectData, salesData, makeLogsData, materialsData] = await Promise.all([
        getProject(Number(id)),
        getProjectSales(Number(id)),
        getMakeLogs(Number(id)),
        getProjectMaterials(Number(id)),
        getMaterials(),
      ]);
      setProject(projectData);
      setSales(salesData.results ?? salesData);
      setMakeLogs(makeLogsData.results ?? makeLogsData);
      setMaterials(materialsData.results ?? materialsData);
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);

  const fetchSales = async () => {
    if (!id) return;
    try {
      const data = await getProjectSales(Number(id), {
        tags: filterTagIds.length ? filterTagIds : undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
      });
      setSales(data.results ?? data);
    } catch {
      toast.error("Failed to load sales");
    }
  };

  useEffect(() => { if (project) fetchSales(); }, [filterTagIds, filterDateFrom, filterDateTo]);

  const handleRemoveMaterial = async (materialId: number) => {
    if (!id) return;
    const confirmed = window.confirm("Remove this material from the project?");
    if (!confirmed) return;
    try {
      await removeProjectMaterial(Number(id), materialId);
      toast.success("Material removed");
      fetchAll();
    } catch {
      toast.error("Failed to remove material");
    }
  };

  const handleSaveHourlyRate = async () => {
    setSavingRate(true);
    try {
      const formData = new FormData();
      formData.append("hourly_rate", hourlyRate);
      const res = await fetch("/api/auth/profile/", {
        method: "PATCH",
        credentials: "include",
        headers: { "X-CSRFToken": getCookie("csrftoken") ?? "" },
        body: formData,
      });
      if (res.ok) {
        const updated = await res.json();
        auth?.setUser(updated);
        toast.success("Hourly rate updated");
      }
    } catch {
      toast.error("Failed to update hourly rate");
    } finally {
      setSavingRate(false);
    }
  };

  if (loading) return <p className="text-center text-muted-foreground py-12">Loading...</p>;
  if (!project) return <p className="text-center text-destructive py-12">Project not found.</p>;

  const allTags = Array.from(new Map(sales.flatMap((s) => s.tags).map((t) => [t.id, t])).values());
  const totalSold = sales.reduce((sum, s) => sum + s.units_sold, 0);
  const totalMade = makeLogs.reduce((sum, m) => sum + m.units_made, 0);

  // Pricing calculator values
  const materialCost = project.material_cost_per_unit ? parseFloat(project.material_cost_per_unit) : null;
  const avgMins = project.avg_duration_minutes;
  const rate = parseFloat(hourlyRate) || 14.15;
  const labourCost = avgMins ? (avgMins / 60) * rate : null;
  const minimumPrice = materialCost !== null && labourCost !== null
    ? materialCost + labourCost
    : materialCost ?? labourCost ?? null;
  const currentPrice = project.product_price ? parseFloat(project.product_price) : null;
  const isPriceTooLow = minimumPrice !== null && currentPrice !== null && currentPrice < minimumPrice;

  const formatDuration = (minutes: number | null | undefined) => {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className="w-full px-4 py-10 space-y-6">
      {/* Header */}
      <div>
        <button type="button" className="text-white text-sm mb-2 hover:underline" onClick={() => navigate("/studio")}>
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white">{project.name}</h1>
      </div>

      {/* Summary card */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: "Units Made", value: totalMade },
              { label: "In Stock", value: project.in_stock },
              { label: "Units Sold", value: totalSold },
              { label: "Avg Make Time", value: formatDuration(project.avg_duration_minutes) },
              { label: "Material Cost/Unit", value: materialCost !== null ? `€${materialCost.toFixed(2)}` : "—" },
              { label: "Linked Product", value: project.product_title ?? "None", link: project.product ? `/products/${project.product}/edit` : null },
            ].map(({ label, value, link }) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
                {link ? (
                  <button type="button" className="font-medium hover:underline text-[hsl(var(--primary))]" onClick={() => navigate(link)}>
                    {String(value)} →
                  </button>
                ) : (
                  <p className="font-medium">{String(value)}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {project.notes && (
        <Card className="bg-[#fdf8f6]">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{project.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Pricing Calculator */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>Suggested Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Material Cost (€)</p>
              <p className="font-medium">
                {materialCost !== null ? `€${materialCost.toFixed(2)}` : "—"}
              </p>
              {materialCost === null && (
                <p className="text-xs text-muted-foreground">Add costs to your materials</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Labour</p>
              <p className="font-medium">
                {labourCost !== null ? `€${labourCost.toFixed(2)}` : "—"}
              </p>
              {avgMins === null || avgMins === undefined ? (
                <p className="text-xs text-muted-foreground">Log a make with duration</p>
              ) : (
                <p className="text-xs text-muted-foreground">{formatDuration(avgMins)} × €{rate.toFixed(2)}/hr</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Hourly Rate (€)</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={handleSaveHourlyRate} disabled={savingRate}>
                  {savingRate ? "..." : "Save"}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Suggested Minimum Price</span>
            <span className={`font-semibold text-base ${minimumPrice !== null ? "text-[hsl(var(--primary))]" : "text-muted-foreground"}`}>
              {minimumPrice !== null ? `€${minimumPrice.toFixed(2)}` : "—"}
            </span>
          </div>

          {isPriceTooLow && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700 text-xs">
              ⚠ Your current price (€{currentPrice?.toFixed(2)}) is below the suggested minimum. Consider raising it to cover your costs.
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Update your hourly rate in{" "}
            <button className="underline hover:text-foreground" onClick={() => navigate("/profile")}>
              Profile Settings
            </button>{" "}
            to apply across all projects.
          </p>
        </CardContent>
      </Card>

      {/* Materials */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recipe</CardTitle>
            <Button size="sm" onClick={() => setShowMaterials(true)}>+ Add Material</Button>
          </div>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No materials linked yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead>Unit Type</TableHead>
                    <TableHead>Qty Per Make</TableHead>
                    <TableHead>Cost Per Unit</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((pm) => (
                    <TableRow key={pm.id}>
                      <TableCell className="font-medium">{pm.material_name}</TableCell>
                      <TableCell>{pm.material_unit_type}</TableCell>
                      <TableCell>
                        {pm.quantity_used !== null
                          ? `${pm.quantity_used} ${pm.material_unit_type}`
                          : <span className="text-muted-foreground">not set</span>}
                      </TableCell>
                      <TableCell>
                        {pm.material_cost_per_unit
                          ? `€${pm.material_cost_per_unit}`
                          : <span className="text-muted-foreground">not set</span>}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm"
                          className="text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => handleRemoveMaterial(pm.material)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Make History */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>
            Make History
            <span className="ml-2 text-sm font-normal text-muted-foreground">{totalMade} units made total</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {makeLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No makes logged yet — click "Log Make / Sale" to record a production run.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Units Made</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Materials Deducted</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {makeLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.date_made ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{log.units_made}</TableCell>
                      <TableCell>{formatDuration(log.duration_minutes)}</TableCell>
                      <TableCell>
                        {log.deducted_materials
                          ? <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Yes</Badge>
                          : <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">No</Badge>}
                      </TableCell>
                      <TableCell>{log.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales History */}
      <Card className="bg-[#fdf8f6]">
        <CardHeader>
          <CardTitle>
            Sales History
            <span className="ml-2 text-sm font-normal text-muted-foreground">{totalSold} sold total</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            {allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Tag:</span>
                {allTags.map((tag) => (
                  <button key={tag.id} type="button"
                    onClick={() => setFilterTagIds((prev) =>
                      prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                    )}
                    className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                      filterTagIds.includes(tag.id)
                        ? "bg-[hsl(var(--primary))] text-white border-transparent"
                        : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                    }`}>
                    {tag.name}
                  </button>
                ))}
                {filterTagIds.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setFilterTagIds([])}>Clear</Button>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">From:</span>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                className="text-xs px-2 py-1 border border-border rounded bg-background" />
              <span className="text-xs text-muted-foreground">To:</span>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                className="text-xs px-2 py-1 border border-border rounded bg-background" />
              {(filterDateFrom || filterDateTo) && (
                <Button variant="ghost" size="sm" className="h-6 text-xs"
                  onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}>Clear</Button>
              )}
            </div>
          </div>

          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No sales logged yet.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Units Sold</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.sale_date}</TableCell>
                      <TableCell>{sale.units_sold}</TableCell>
                      <TableCell>
                        {sale.sale_price ? `€${sale.sale_price}` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sale.tags.length > 0
                            ? sale.tags.map((t) => <Badge key={t.id} variant="secondary">{t.name}</Badge>)
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell>{sale.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showLogAction && (
        <ProjectLogActionModal
          project={project}
          onClose={() => setShowLogAction(false)}
          onLogged={() => { setShowLogAction(false); fetchAll(); }}
        />
      )}
      {showMaterials && (
        <ProjectMaterialsModal
          project={project}
          onClose={() => setShowMaterials(false)}
          onSaved={() => { setShowMaterials(false); fetchAll(); }}
        />
      )}
    </div>
  );
}