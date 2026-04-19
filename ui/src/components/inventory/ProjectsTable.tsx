import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender, ColumnDef, SortingState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Project } from "../../types/inventory";
import { ArrowUpDown, ArrowUp, ArrowDown, History, Package, Pencil, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  projects: Project[];
  onDelete: (project: Project) => void;
  onLogAction: (project: Project) => void;
  onHistory: (project: Project) => void;
  onMaterials: (project: Project) => void;
  onEdit: (project: Project) => void;
};

const LOW_STOCK_THRESHOLD = 3;

export default function ProjectsTable({ projects, onDelete, onLogAction, onHistory, onMaterials, onEdit }: Props) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const SortHeader = ({ column, label }: { column: any; label: string }) => (
    <button
      aria-label={`Sort by ${label.toLowerCase()}`}
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
    {
      accessorKey: "name",
      header: ({ column }) => <SortHeader column={column} label="Name" />,
      cell: ({ row }) => (
        <button
          aria-label={`View project: ${row.getValue("name")}`}
          className="font-medium text-left hover:underline max-w-[30ch] truncate block"
          onClick={() => navigate(`/studio/projects/${row.original.id}`)}
          title={row.getValue("name")}
        >
          {row.getValue("name")}
        </button>
      ),
    },
    {
      accessorKey: "units_made",
      header: ({ column }) => <SortHeader column={column} label="Units Made" />,
    },
    {
      accessorKey: "in_stock",
      header: ({ column }) => <SortHeader column={column} label="In Stock" />,
      cell: ({ row }) => {
        const inStock = row.getValue("in_stock") as number;
        if (inStock === 0) return (
          <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Out of stock</Badge>
        );
        if (inStock <= LOW_STOCK_THRESHOLD) return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">{inStock} — low</Badge>
        );
        return (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">{inStock}</Badge>
        );
      },
    },
    {
      accessorKey: "units_sold",
      header: ({ column }) => <SortHeader column={column} label="Sold" />,
    },
    {
      accessorKey: "product_title",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Linked Product</span>,
      cell: ({ row }) => {
        const project = row.original;
        return project.product ? (
          <button
            aria-label={`View linked product: ${project.product_title}`}
            className="text-sm hover:underline text-left max-w-[20ch] truncate block text-[hsl(var(--primary))]"
            onClick={() => navigate(`/products/${project.product}/edit`)}
            title={project.product_title ?? ""}
          >
            {project.product_title}
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Actions</span>,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button aria-label={`Log make for: ${project.name}`} size="sm" onClick={() => onLogAction(project)} className="text-xs h-7 px-2">
              Log Make
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label={`View sales history for: ${project.name}`} variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onHistory(project)}>
                  <History className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>View History</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label={`Manage materials for: ${project.name}`} variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onMaterials(project)}>
                  <Package className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Manage Materials</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label={`Edit project: ${project.name}`} variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(project)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Edit Project</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label={`Delete project: ${project.name}`}
                  variant="ghost" size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(project)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Delete Project</p></TooltipContent>
            </Tooltip>
          </div>
        );
      },
    },
  ], [navigate, onDelete, onLogAction, onHistory, onMaterials, onEdit]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="🔎︎ Search projects..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="w-56 h-8 text-sm"
        />
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {table.getFilteredRowModel().rows.length} of {projects.length} projects
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-gray-400">
                  {projects.length === 0
                    ? "No projects yet — click \"+ New Project\" to get started."
                    : "No projects match your search."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
        <div className="flex gap-2">
          <Button aria-label="Previous page" variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button aria-label="Next page" variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>
    </div>
  );
}