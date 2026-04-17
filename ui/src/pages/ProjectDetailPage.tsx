import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getProject, getMakeLogs, getProjectMaterials, removeProjectMaterial,
} from "../services/inventoryApi";
import { Project, MakeLog, ProjectMaterial } from "../types/inventory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Clock, Package, TrendingUp, ShoppingBag,
  Pencil, ImageIcon,
} from "lucide-react";
import LogMakeModal from "../components/inventory/LogMakeModal";
import ProjectMaterialsModal from "../components/inventory/ProjectMaterialsModal";
import EditProjectModal from "../components/inventory/EditProjectModal";
import { AuthContext } from "../context/AuthContext";
import { getCookie, API_URL } from "../services/api";

// ── Shared primitives matching MarketDetailPage ───────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-white/80 text-sm mt-0.5">{subtitle}</p>}
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, sub,
}: {
  label: string; value: string | number; icon: React.ElementType; sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-border p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-600 uppercase tracking-wide leading-tight">
          {label}
        </span>
        <Icon className="w-4 h-4 text-neutral-500" aria-hidden="true" />
      </div>
      <div className="text-3xl font-bold text-neutral-900">{value}</div>
      {sub && <div className="text-sm text-neutral-600">{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [project, setProject] = useState<Project | null>(null);
  const [makeLogs, setMakeLogs] = useState<MakeLog[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogMake, setShowLogMake] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [hourlyRate, setHourlyRate] = useState(auth?.user?.hourly_rate ?? "14.15");
  const [savingRate, setSavingRate] = useState(false);

  const fetchAll = async () => {
    if (!id) return;
    try {
      const [projectData, makeLogsData, materialsData] = await Promise.all([
        getProject(Number(id)),
        getMakeLogs(Number(id)),
        getProjectMaterials(Number(id)),
      ]);
      setProject(projectData);
      setMakeLogs(makeLogsData.results ?? makeLogsData);
      setMaterials(materialsData.results ?? materialsData);
    } catch {
      toast.error("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [id]);


  const handleRemoveMaterial = async (materialId: number) => {
    if (!id || !window.confirm("Remove this material from the project?")) return;
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
      const res = await fetch(`${API_URL}/api/auth/profile/`, {
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

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <p className="text-white/70 text-sm">Loading project…</p>
    </div>
  );
  if (!project) return null;

  const totalMade = makeLogs.reduce((sum, m) => sum + m.units_made, 0);
  const materialCost = project.material_cost_per_unit ? parseFloat(project.material_cost_per_unit) : null;
  const avgMins = project.avg_duration_minutes;
  const rate = parseFloat(String(hourlyRate)) || 14.15;
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
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ── Back ── */}
      <button
        onClick={() => navigate("/studio")}
        className="text-white/70 hover:text-white text-sm flex items-center gap-1 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Studio
      </button>

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{project.name}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {project.product_title && (
              <button
                className="text-white/70 text-sm hover:text-white transition-colors flex items-center gap-1"
                onClick={() => navigate(`/products/${project.product}/edit`)}
              >
                <Package className="w-3.5 h-3.5" />
                {project.product_title} →
              </button>
            )}
            {project.notes && (
              <span className="text-white/60 text-sm italic truncate max-w-[40ch]">
                {project.notes}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowEdit(true)}
            className="gap-1.5 bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Button>
        </div>
      </div>

      {/* ── Images ── */}
      {project.images && project.images.length > 0 && (
        <div className="space-y-2">
          <SectionHeader title="Photos" />
          <div className="flex gap-3 flex-wrap">
            {project.images.map((img) => (
              <div key={img.id} className="h-40 w-40 rounded-lg overflow-hidden border border-white/20 shrink-0">
                <img
                  src={img.image_url || ""}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── At a Glance ── */}
      <div className="space-y-2">
        <SectionHeader
          title="At a Glance"
          subtitle="Your production stats for this project."
        />
        <Card className="bg-white border-neutral-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Units Made"
                value={totalMade}
                icon={Package}
                sub={totalMade === 0 ? "Log a make to start" : undefined}
              />
              <StatCard
                label="In Stock"
                value={project.in_stock}
                icon={ShoppingBag}
              />
              <StatCard
                label="Units Sold"
                value={project.units_sold}
                icon={TrendingUp}
                sub={project.units_sold === 0 ? "No sales yet" : undefined}
              />
              <StatCard
                label="Avg Make Time"
                value={formatDuration(avgMins)}
                icon={Clock}
                sub={!avgMins ? "Log a make with duration" : undefined}
              />
            </div>
            <div className="pt-4">
              <Button
                onClick={async () => { await fetchAll(); setShowLogMake(true); }}
                className="w-full h-10 gap-2"
              >
                Log Make
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    {/* ── Linked Product ── */}
    {project.product && (
      <div className="space-y-2">
        <SectionHeader title="Linked Product" />
        <Card className="bg-white border-neutral-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Product Title</p>
                <p className="text-lg text-neutral-900">{project.product_title}</p>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Price</p>
                <p className="text-lg font-regu text-neutral-900">
                  {project.product_price ? `€${parseFloat(project.product_price).toFixed(2)}` : "Not set"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/products/${project.product}/edit`)}
              >
                View Product →
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )}

      {/* ── Suggested Pricing ── */}
      <div className="space-y-2">
        <SectionHeader
          title="Suggested Pricing"
          subtitle="Based on your material costs and time."
        />
        <Card className="bg-white border-neutral-200">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Material Cost</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {materialCost !== null ? `€${materialCost.toFixed(2)}` : "—"}
                </p>
                {materialCost === null && (
                  <p className="text-xs text-muted-foreground">Add costs to your materials</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Labour Cost</p>
                <p className="text-2xl font-bold text-neutral-900">
                  {labourCost !== null ? `€${labourCost.toFixed(2)}` : "—"}
                </p>
                {avgMins
                  ? <p className="text-xs text-muted-foreground">{formatDuration(avgMins)} × €{rate.toFixed(2)}/hr</p>
                  : <p className="text-xs text-muted-foreground">Log a make with duration</p>}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Hourly Rate (€)</p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" step="0.01" min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" className="h-8 text-xs shrink-0"
                    onClick={handleSaveHourlyRate} disabled={savingRate}>
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
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-amber-700 text-xs" role="alert">
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
      </div>

      {/* ── Recipe ── */}
      <div className="space-y-2">
        <SectionHeader
          title="Recipe"
          subtitle="Materials used per make."
        />
        <Card className="bg-white border-neutral-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowMaterials(true)}>
                + Add Material
              </Button>
            </div>
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No materials linked yet.</p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 p-2">
                        <span className="text-xs font-semibold uppercase tracking-wide">Photo</span>
                      </TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Material</span></TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Unit Type</span></TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Qty Per Make</span></TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Cost Per Unit</span></TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.map((pm) => (
                      <TableRow key={pm.id}>
                        <TableCell className="p-2 w-14">
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {pm.material_photo_url ? (
                              <img src={pm.material_photo_url} alt={pm.material_name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
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
                          <Button
                            variant="outline" size="sm"
                            className="text-red-600 hover:bg-red-50 border-red-200"
                            onClick={() => handleRemoveMaterial(pm.material)}
                          >
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
      </div>

      {/* ── Make History ── */}
      <div className="space-y-2">
        <SectionHeader
          title="Make History"
          subtitle={`${totalMade} units made total`}
        />
        <Card className="bg-white border-neutral-200">
          <CardContent className="p-6">
            {makeLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No makes logged yet — click "Log Make" above to record a production run.
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Date</span></TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Units Made</span></TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Duration</span></TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Materials Deducted</span></TableHead>
                      <TableHead><span className="text-xs font-semibold uppercase tracking-wide">Notes</span></TableHead>
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
      </div>

      {/* ── Modals ── */}
      {showLogMake && (
        <LogMakeModal
          project={project}
          onClose={() => setShowLogMake(false)}
          onLogged={() => {
            setShowLogMake(false);
            fetchAll();
            // Trigger marketplace refresh
            localStorage.setItem('refreshProducts', Date.now().toString());
          }}
        />
      )}
      {showMaterials && (
        <ProjectMaterialsModal
          project={project}
          onClose={() => setShowMaterials(false)}
          onSaved={() => { setShowMaterials(false); fetchAll(); }}
        />
      )}
      {showEdit && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); fetchAll(); }}
        />
      )}
    </div>
  );
}