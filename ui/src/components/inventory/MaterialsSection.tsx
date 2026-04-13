import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
  ColumnDef, SortingState, ColumnFiltersState, Column,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, X, Search, ArrowUpDown, ArrowUp, ArrowDown, History, Eye, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMaterials, deleteMaterial } from "../../services/inventoryApi";
import { RawMaterial } from "../../types/inventory";
import MaterialFormModal from "./MaterialFormModal";
import RestockDeductModal from "./RestockDeductModal";
import MaterialHistoryModal from "./MaterialHistoryModal";
import MaterialDetailModal from "./MaterialDetailModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function MaterialsSection() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<RawMaterial | null>(null);
  const [logTarget, setLogTarget] = useState<RawMaterial | null>(null);
  const [historyTarget, setHistoryTarget] = useState<RawMaterial | null>(null);
  const [detailTarget, setDetailTarget] = useState<RawMaterial | null>(null);

  const fetchMaterials = async () => {
    try {
      const data = await getMaterials();
      const list: RawMaterial[] = Array.isArray(data) ? data : data.results ?? [];
      // Low stock first
      setMaterials([
        ...list.filter((m) => m.is_low_stock),
        ...list.filter((m) => !m.is_low_stock),
      ]);
    } catch {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleDelete = async (material: RawMaterial) => {
    if (!window.confirm(`Delete "${material.name}"?`)) return;
    try {
      await deleteMaterial(material.id);
      toast.success("Material deleted");
      fetchMaterials();
    } catch (err: any) {
      toast.error(
        err.message?.includes("linked")
          ? "Remove this material from all projects before deleting."
          : "Failed to delete material"
      );
    }
  };

  const allTags = useMemo(
    () => [...new Set(materials.flatMap((m) => m.tags ?? []))].sort(),
    [materials]
  );

  const filteredByTags = useMemo(() => {
    if (selectedTags.length === 0) return materials;
    return materials.filter((m) => selectedTags.some((tag) => (m.tags ?? []).includes(tag)));
  }, [materials, selectedTags]);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);

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

  const columns: ColumnDef<RawMaterial>[] = useMemo(() => [
    // ── Image ──────────────────────────────────────────────────────────
    {
      id: "image",
      header: () => <span className="sr-only">Image</span>,
      enableSorting: false,
      size: 56,
      cell: ({ row }) => {
        const m = row.original;
        return m.photo_url ? (
          <img
            src={m.photo_url}
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
      cell: ({ row }) => <span className="font-medium text-neutral-700">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "unit_type",
      header: ({ column }) => <SortHeader column={column} label="Unit Type" />,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => <SortHeader column={column} label="In Stock" />,
      cell: ({ row }) => {
        const m = row.original;
        return <span className="text-neutral-700">{m.quantity} {m.unit_type}</span>;
      },
    },
    {
      accessorKey: "is_low_stock",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Status</span>,
      cell: ({ row }) => row.getValue("is_low_stock") ? (
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Low Stock</Badge>
      ) : (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">OK</Badge>
      ),
      filterFn: (row, _, filterValue) => {
        if (filterValue === "low") return row.getValue("is_low_stock") === true;
        return true;
      },
    },
    {
      accessorKey: "brand",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Brand</span>,
      cell: ({ row }) => row.getValue("brand") ?? "—",
    },
    {
      accessorKey: "source",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Source</span>,
      cell: ({ row }) => row.getValue("source") ?? "—",
    },
    {
      accessorKey: "tags",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Tags</span>,
      cell: ({ row }) => {
        const tags: string[] = row.getValue("tags") ?? [];
        if (!tags.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Actions</span>,
      cell: ({ row }) => {
        const material = row.original;
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setLogTarget(material)}>
                  Restock / Use
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Restock / Use</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setHistoryTarget(material)}>
                  <History className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>History</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDetailTarget(material)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Details</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditTarget(material)}>
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
                  onClick={() => handleDelete(material)}
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
  ], []);

  const table = useReactTable({
    data: filteredByTags,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const lowStockCount = materials.filter((m) => m.is_low_stock).length;

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Loading materials…</p>;

  return (
    <div className="space-y-4">

      {/* ── Toolbar — one row ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-8 w-48 text-sm"
            />
          </div>

          {/* Low stock filter */}
          <Button
            variant={(table.getColumn("is_low_stock")?.getFilterValue() as string) === "low" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const col = table.getColumn("is_low_stock");
              col?.setFilterValue(col.getFilterValue() === "low" ? undefined : "low");
            }}
          >
            {lowStockCount > 0 && <span className="mr-1 text-amber-500">⚠</span>}
            Low Stock {lowStockCount > 0 && `(${lowStockCount})`}
          </Button>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedTags.length > 0 ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs gap-1.5"
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
                        <CommandItem key={tag} value={tag} onSelect={() => toggleTag(tag)}>
                          <Check className={cn("mr-2 size-3", selectedTags.includes(tag) ? "opacity-100" : "opacity-0")} />
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {selectedTags.length > 0 && (
                  <div className="border-t p-2">
                    <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground" onClick={() => setSelectedTags([])}>
                      <X className="size-3 mr-1" /> Clear filters
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Active tag chips */}
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs gap-1 pr-1 cursor-pointer" onClick={() => toggleTag(tag)}>
              {tag} <X className="size-3" />
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {table.getFilteredRowModel().rows.length} of {materials.length} materials
          </span>
          <Button size="sm" onClick={() => setShowCreate(true)}>+ Add Material</Button>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg: any) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header: any) => (
                  <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {materials.length === 0
                    ? `No materials yet — click "+ Add Material" to get started.`
                    : "No materials match your search."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row: any) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
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
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreate && (
        <MaterialFormModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); fetchMaterials(); }} />
      )}
      {editTarget && (
        <MaterialFormModal material={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); fetchMaterials(); }} />
      )}
      {logTarget && (
        <RestockDeductModal material={logTarget} onClose={() => setLogTarget(null)} onSaved={() => { setLogTarget(null); fetchMaterials(); }} />
      )}
      {historyTarget && (
        <MaterialHistoryModal material={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
      {detailTarget && (
        <MaterialDetailModal material={detailTarget} onClose={() => setDetailTarget(null)} onSaved={() => { setDetailTarget(null); fetchMaterials(); }} />
      )}
    </div>
  );
}