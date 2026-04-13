import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
  ColumnDef, SortingState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpDown, ArrowUp, ArrowDown, History, Package,
  Pencil, Trash2, Search, Eye, ExternalLink,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getProjects, deleteProject, getProject } from "../../services/inventoryApi";
import { Project } from "../../types/inventory";
import CreateProjectModal from "./CreateProjectModal";
import LogMakeModal from "./LogMakeModal";
import MakeHistoryModal from "./MakeHistoryModal";
import ProjectMaterialsModal from "./ProjectMaterialsModal";
import EditProjectModal from "./EditProjectModal";

export default function ProjectsSection() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [logTarget, setLogTarget] = useState<Project | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Project | null>(null);
  const [materialsTarget, setMaterialsTarget] = useState<Project | null>(null);
  const [editTarget, setEditTarget] = useState<Project | null>(null);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data.results ?? data);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleLogAction = async (project: Project) => {
    try {
      const fresh = await getProject(project.id);
      setLogTarget(fresh);
    } catch {
      setLogTarget(project);
    }
  };

  const handleDelete = async (project: Project) => {
    if (!window.confirm(`Delete "${project.name}"? This will also delete all linked makes.`)) return;
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  const SortHeader = ({ column, label }: { column: any; label: string }) => (
    <button
      className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> :
        column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> :
        <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );

  const columns: ColumnDef<Project>[] = useMemo(() => [
    // ── Image ──────────────────────────────────────────────────────────
    {
      id: "image",
      header: () => <span className="sr-only">Image</span>,
      enableSorting: false,
      size: 56,
      cell: ({ row }) => {
        const first = row.original.images?.[0];
        return first ? (
          <img
            src={first.image_url}
            alt=""
            aria-hidden="true"
            className="h-14 w-14 rounded-md object-cover border border-neutral-200"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-neutral-300 text-lg">✦</span>
          </div>
        );
      },
    },
    // ── Name ───────────────────────────────────────────────────────────
    {
      accessorKey: "name",
      header: ({ column }) => <SortHeader column={column} label="Name" />,
      cell: ({ row }) => (
        <span
          className="font-medium max-w-[28ch] truncate block text-neutral-700"
          title={row.getValue("name")}
        >
          {row.getValue("name")}
        </span>
      ),
    },
    // ── Units Made ─────────────────────────────────────────────────────
    {
      accessorKey: "units_made",
      header: ({ column }) => <SortHeader column={column} label="Units Made" />,
      cell: ({ row }) => (
        <span className="text-neutral-700">{row.getValue("units_made")}</span>
      ),
    },
    // ── In Stock ───────────────────────────────────────────────────────
    {
      accessorKey: "in_stock",
      header: ({ column }) => <SortHeader column={column} label="In Stock" />,
      cell: ({ row }) => {
        const val = row.getValue("in_stock") as number;
        return (
          <span className={val === 0 ? "text-neutral-400" : "text-neutral-700"}>
            {val}
          </span>
        );
      },
    },
    // ── Avg Make Time ──────────────────────────────────────────────────
    {
      accessorKey: "avg_duration_minutes",
      header: ({ column }) => <SortHeader column={column} label="Avg Make Time" />,
      cell: ({ row }) => {
        const mins = row.getValue("avg_duration_minutes") as number | null;
        if (!mins) return <span className="text-neutral-400">—</span>;
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return <span className="text-neutral-700">{h > 0 ? `${h}h ${m}m` : `${m}m`}</span>;
      },
    },
    // ── Avg Materials Cost ─────────────────────────────────────────────
    {
      accessorKey: "material_cost_per_unit",
      header: ({ column }) => <SortHeader column={column} label="Materials Cost" />,
      cell: ({ row }) => {
        const cost = row.getValue("material_cost_per_unit") as string | null;
        return cost
          ? <span className="text-neutral-700">€{parseFloat(cost).toFixed(2)}</span>
          : <span className="text-neutral-400">—</span>;
      },
    },
    // ── Linked Product ─────────────────────────────────────────────────
    {
      id: "linked_product",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Product</span>,
      enableSorting: false,
      size: 64,
      cell: ({ row }) => {
        const project = row.original;
        if (!project.product) return <span className="text-neutral-400">—</span>;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`Go to linked product: ${project.product_title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/products/${project.product}/edit`);
                }}
                className="text-[#C17B6F] hover:text-[#a5655a] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>{project.product_title}</p></TooltipContent>
          </Tooltip>
        );
      },
    },
    // ── Actions ────────────────────────────────────────────────────────
    {
      id: "actions",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Actions</span>,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm" className="h-7 w-7 p-0"
                  onClick={() => navigate(`/studio/projects/${project.id}`)}
                  aria-label="View project"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>View Project</p></TooltipContent>
            </Tooltip>

            <Button
              size="sm"
              onClick={() => handleLogAction(project)}
              className="text-xs h-7 px-2"
            >
              Log Make
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setHistoryTarget(project)}>
                  <History className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Make History</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setMaterialsTarget(project)}>
                  <Package className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Manage Materials</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTarget(project)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Edit</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(project)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Delete</p></TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ], [navigate]);

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Loading projects…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8 h-8 w-48 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {table.getFilteredRowModel().rows.length} of {projects.length} projects
          </span>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ New Project</Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {projects.length === 0
                    ? `No projects yet — click "+ New Project" to get started.`
                    : "No projects match your search."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-neutral-50"
                  onClick={() => navigate(`/studio/projects/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchProjects(); }} />
      )}
      {logTarget && (
        <LogMakeModal project={logTarget} onClose={() => setLogTarget(null)} onLogged={() => { setLogTarget(null); fetchProjects(); }} />
      )}
      {historyTarget && (
        <MakeHistoryModal project={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
      {materialsTarget && (
        <ProjectMaterialsModal project={materialsTarget} onClose={() => setMaterialsTarget(null)} onSaved={() => { setMaterialsTarget(null); fetchProjects(); }} />
      )}
      {editTarget && (
        <EditProjectModal project={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); fetchProjects(); }} />
      )}
    </div>
  );
}