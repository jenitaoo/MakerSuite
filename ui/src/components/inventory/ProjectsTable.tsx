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
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type Props = {
  projects: Project[];
  onDelete: (project: Project) => void;
  onLogAction: (project: Project) => void;
  onHistory: (project: Project) => void;
  onMaterials: (project: Project) => void;
  onEdit: (project: Project) => void;
};

export default function ProjectsTable({ projects, onDelete, onLogAction, onHistory, onMaterials, onEdit }: Props) {
  const navigate = useNavigate();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<Project>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black min-w-[50ch] max-w-[50ch]" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
      cell: ({ row }) => (
        <button className="font-medium text-left hover:underline" onClick={() => navigate(`/studio/projects/${row.original.id}`)}>
          {row.getValue("name")}
        </button>
      ),
    },
    {
      accessorKey: "units_made",
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Units Made
          {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
    },
    {
      accessorKey: "in_stock",
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          In Stock
          {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
      cell: ({ row }) => {
        const inStock = row.getValue("in_stock") as number;
        return inStock > 0
          ? <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">{inStock}</Badge>
          : <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">0</Badge>;
      },
    },
    {
      accessorKey: "units_sold",
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Sold
          {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
    },
    {
      accessorKey: "product_title",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Linked Product</span>,
      cell: ({ row }) => {
        const project = row.original;
        return project.product ? (
          <button
            className="text-sm hover:underline text-left min-w-[3ch] max-w-[30ch] truncate block"
            onClick={() => navigate(`/products/${project.product}/edit`)}
          >
            {project.product_title}
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Last Updated
          {column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> : column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUpDown className="h-3 w-3 opacity-40" />}
        </button>
      ),
      cell: ({ row }) => new Date(row.getValue("updated_at")).toLocaleDateString(),
    },
    {
      id: "actions",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Actions</span>,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex gap-1 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onLogAction(project)}>
              Log Make / Sale
            </Button>
            <Button variant="outline" size="sm" onClick={() => onHistory(project)}>
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMaterials(project)}>
              Materials
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(project)}>
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 border-red-200" onClick={() => onDelete(project)}>
              Delete
            </Button>
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Input placeholder="🔎︎ Search projects..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="w-56 h-8 text-sm" />
        <span className="text-sm text-gray-500">{table.getFilteredRowModel().rows.length} of {projects.length} projects</span>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>)}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-gray-400">
                  {projects.length === 0 ? "No projects yet — click \"New Project\" to get started." : "No projects match your search."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>
    </div>
  );
}