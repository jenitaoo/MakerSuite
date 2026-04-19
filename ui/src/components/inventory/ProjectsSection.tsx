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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowUpDown, ArrowUp, ArrowDown, History,
  EllipsisVertical, Trash2, Search, ToolCase, ExternalLink, Check, X,
} from "lucide-react";
import { getProjects, getProject } from "../../services/inventoryApi";
import { Project } from "../../types/inventory";
import CreateProjectModal from "./CreateProjectModal";
import LogMakeModal from "./LogMakeModal";
import MakeHistoryModal from "./MakeHistoryModal";
import ProjectMaterialsModal from "./ProjectMaterialsModal";
import DeleteProjectModal from "./DeleteProjectModal";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Command, CommandEmpty, CommandItem, CommandList, CommandInput, CommandGroup } from "../ui/command";
import { cn } from "@/lib/utils";

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
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const inStockCount = projects.filter(p => p.in_stock > 0).length;
  const outOfStockCount = projects.filter(p => p.in_stock === 0).length;

  // For tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  const allTags = useMemo(
    () => [...new Set(projects.flatMap((p) => p.tags ?? []))].sort(),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    let data = projects;

    // TAGS
    if (selectedTags.length > 0) {
      data = data.filter(p =>
        selectedTags.some(tag => (p.tags ?? []).includes(tag))
      );
    }

    // STATUS
    if (statusFilter === "in") {
      data = data.filter(p => p.in_stock > 0);
    } else if (statusFilter === "out") {
      data = data.filter(p => p.in_stock === 0);
    }

    return data;
  }, [projects, selectedTags, statusFilter]);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

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
  useEffect(() => {
    console.log("PROJECTS:", projects);
    console.log("TAGS:", projects.map(p => p.tags));
  }, [projects]);

  const handleLogAction = async (project: Project) => {
    try {
      const fresh = await getProject(project.id);
      setLogTarget(fresh);
    } catch {
      setLogTarget(project);
    }
  };

  const handleDelete = (project: Project) => setDeleteTarget(project);

  const SortHeader = ({ column, label }: { column: any; label: string }) => (
    <button
      aria-label={`Sort by ${label}`}
      className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black whitespace-nowrap"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> :
        column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> :
        <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );

  const columns: ColumnDef<Project>[] = useMemo(() => [
    {
      id: "image",
      header: () => <span className="sr-only">Image</span>,
      enableSorting: false,
      size: 56,
      minSize: 56,
      maxSize: 56,
      cell: ({ row }) => {
        const first = row.original.images?.[0];
        return first ? (
          <img
            src={first.image_url || ""}
            alt=""
            aria-hidden="true"
            className="h-14 w-14 rounded-md object-cover border border-neutral-200 flex-shrink-0"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <span className="text-neutral-300 text-lg">✦</span>
          </div>
        );
      },
    },

    {
      accessorKey: "name",
      header: ({ column }) => <SortHeader column={column} label="Name" />,
      size: 180,
      minSize: 140,
      maxSize: 180,
      cell: ({ row }) => (
        <div style={{ width: "180px", maxWidth: "180px" }}>
          <span className="font-medium text-neutral-700 break-words line-clamp-2 block">
            {row.getValue("name")}
          </span>
        </div>
      ),
    },

    {
      accessorKey: "in_stock",
      header: ({ column }) => <SortHeader column={column} label="In Stock" />,
      size: 75,
      minSize: 75,
      maxSize: 75,
      cell: ({ row }) => {
        const val = row.getValue("in_stock") as number;
        return <span className="text-neutral-700 whitespace-nowrap">{val}</span>;
      },
    },

    {
      accessorKey: "units_made",
      header: ({ column }) => <SortHeader column={column} label="Units Made" />,
      size: 85,
      minSize: 85,
      maxSize: 85,
      cell: ({ row }) => (
        <span className="text-neutral-700 whitespace-nowrap">{row.getValue("units_made")}</span>
      ),
    },

    {
      accessorKey: "avg_duration_minutes",
      header: ({ column }) => (
        <button
          aria-label="Sort by average make time"
          className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span className="block leading-tight">Avg</span>
          <span className="block leading-tight">Make</span>
          <span className="block leading-tight">Time</span>
          {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> :
            column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> :
            <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
      size: 65,
      minSize: 65,
      maxSize: 65,
      cell: ({ row }) => {
        const mins = row.getValue("avg_duration_minutes") as number | null;
        if (!mins) return <span className="text-neutral-400">—</span>;
        const h = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return <span className="text-neutral-700 whitespace-nowrap text-sm">{h > 0 ? `${h}h ${m}m` : `${m}m`}</span>;
      },
    },

    {
      accessorKey: "material_cost_per_unit",
      header: ({ column }) => (
        <button
          aria-label="Sort by material cost per unit"
          className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <span className="block leading-tight">Materials</span>
          <span className="block leading-tight">Cost</span>
          <span className="block leading-tight">(€)</span>
          {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> :
            column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> :
            <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
      size: 80,
      minSize: 80,
      maxSize: 80,
      cell: ({ row }) => {
        const cost = row.getValue("material_cost_per_unit") as string | null;
        return cost
          ? <span className="text-neutral-700 whitespace-nowrap text-sm">€{parseFloat(cost).toFixed(2)}</span>
          : <span className="text-neutral-400">—</span>;
      },
    },

    {
      id: "linked_product",
      header: () => <span className="font-medium text-xs uppercase tracking-wide whitespace-nowrap">Product</span>,
      size: 60,
      minSize: 60,
      maxSize: 60,
      cell: ({ row }) => {
        const project = row.original;
        if (!project.product) return <span className="text-neutral-400">—</span>;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label={`View product: ${project.product_title}`} 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/products/${project.product}/edit`);
                }}
                className="text-[#844839] hover:text-[#a5655a] transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>{project.product_title}</p></TooltipContent>
          </Tooltip>
        );
      },
    },

    {
      accessorKey: "tags",
      header: ({ column }) => <SortHeader column={column} label="Tags" />,
      size: 120,
      minSize: 100,
      maxSize: 150,
      cell: ({ row }) => {
        const tags: string[] = row.getValue("tags") ?? [];
        if (!tags.length) return <span className="text-muted-foreground">—</span>;

        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{tags.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },

    {
      id: "actions",
      header: () => <span className="font-medium text-xs uppercase tracking-wide whitespace-nowrap">Actions</span>,
      enableSorting: false,
      size: 160,
      minSize: 160,
      maxSize: 160,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Log make for: ${project.name}`}
                  size="sm"
                  onClick={() => handleLogAction(project)}
                  className="h-7 px-2 text-xs whitespace-nowrap"
                >
                  Log Make
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Log a new make</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Manage materials for: ${project.name}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setHistoryTarget(project)}
                >
                  <History className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>History</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Manage materials for: ${project.name}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setMaterialsTarget(project)}
                >
                  <ToolCase className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Materials</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`View details for: ${project.name}`}
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => navigate(`/studio/projects/${project.id}`)}
                >
                  <EllipsisVertical className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Details</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Delete project: ${project.name}`}
                  variant="ghost"
                  size="sm"
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
    data: filteredProjects,
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

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3">

        {/* SEARCH */}
        <div className="w-full sm:w-[320px] md:w-[420px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects by name"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-8 w-full text-sm"
            />
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">

          {/* STATUS FILTER */}
          <select
            aria-label="Status Filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">All statuses</option>

            <option value="in">
              In Stock {inStockCount > 0 ? `(${inStockCount})` : ""}
            </option>

            <option value="out">
              Out of Stock {outOfStockCount > 0 ? `(${outOfStockCount})` : ""}
            </option>
          </select>

          {/* TAG FILTER */}
          {allTags.length > 0 && (
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  aria-label="Filter by tags"
                  variant={selectedTags.length > 0 ? "default" : "outline"}
                  size="sm"
                  className="h-8 w-full sm:w-auto text-xs gap-1.5"
                >
                  Tags {selectedTags.length > 0 && `(${selectedTags.length})`}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-56 p-0 bg-white" align="start">
                <Command>
                  <CommandInput placeholder="Search tags..." />
                  <CommandList>
                    <CommandEmpty>No tags found.</CommandEmpty>
                    <CommandGroup>
                      {allTags.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => toggleTag(tag)}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-3",
                              selectedTags.includes(tag)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>

                {selectedTags.length > 0 && (
                  <div className="border-t p-2">
                    <Button
                      aria-label="Clear tag filters"
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs text-muted-foreground"
                      onClick={() => setSelectedTags([])}
                    >
                      <X className="size-3 mr-1" /> Clear filters
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* ACTIVE TAGS */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs gap-1 pr-1 cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag} <X className="size-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER (COUNT + BUTTON) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

          <span className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} of {projects.length} projects
          </span>

          <Button
            aria-label="Create new project"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="w-full sm:w-auto"
          >
            + New Project
          </Button>

        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(header => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-nowrap"
                  >
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
                  No projects found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-neutral-50"
                  onClick={() => navigate(`/studio/projects/${row.original.id}`)}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                      className="text-nowrap"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
        <div className="flex gap-2">
          <Button aria-label="Previous page" variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button aria-label="Next page" variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>

      {/* ── Modals ── */}
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
      {deleteTarget && (
        <DeleteProjectModal
          project={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); fetchProjects(); }}
        />
      )}
    </div>
  );
}