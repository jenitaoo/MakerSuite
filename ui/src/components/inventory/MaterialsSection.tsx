import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Check, X, Search, ArrowUpDown, ArrowUp, ArrowDown, History, Trash2, EllipsisVertical, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMaterials, deleteMaterial } from "../../services/inventoryApi";
import { RawMaterial } from "../../types/inventory";
import CreateMaterialModal from "./CreateMaterialModal";
import RestockDeductModal from "./RestockDeductModal";
import MaterialHistoryModal from "./MaterialHistoryModal";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import DeleteMaterialModal from "./DeleteMaterialModal";

export default function MaterialsSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch materials using React Query
  const { data: materialsData = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: getMaterials,
  });

  // Normalize data (handle array or paginated response)
  const materials = useMemo(() => {
    const list: RawMaterial[] = Array.isArray(materialsData) ? materialsData : materialsData.results ?? [];
    // Low stock first
    return [
      ...list.filter((m) => m.is_low_stock),
      ...list.filter((m) => !m.is_low_stock),
    ];
  }, [materialsData]);

  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  const outOfStockCount = materials
    .filter((m) => m.quantity !== null && parseFloat(m.quantity) === 0)
    .length;

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<RawMaterial | null>(null);
  const [logTarget, setLogTarget] = useState<RawMaterial | null>(null);
  const [historyTarget, setHistoryTarget] = useState<RawMaterial | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RawMaterial | null>(null);

  // Refetch helper - this is called whenever materials change
  const refetchMaterials = () => {
    queryClient.invalidateQueries({ queryKey: ["materials"] });
  };

  const handleDelete = (material: RawMaterial) => setDeleteTarget(material);

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
      aria-label={`Sort by ${label}`}
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
            className="h-14 w-14 rounded-md object-cover border border-neutral-200 flex-shrink-0"
          />
        ) : (
          <div
            className="h-14 w-14 rounded-md bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0"
          >
            <span className="text-neutral-300 text-lg">✦</span>
          </div>
        );
      },
    },

    {
      accessorKey: "name",
      header: ({ column }) => <SortHeader column={column} label="Name" />,
      cell: ({ row }) => (
        <div style={{ width: "200px", maxWidth: "200px" }}>
          <span className="font-medium text-neutral-700 break-words line-clamp-2 block">
            {row.getValue("name")}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "sku",
      header: ({ column }) => <SortHeader column={column} label="SKU" />,
      size: 100,
      minSize: 80,
      maxSize: 100,
      cell: ({ row }) => {
        const sku = row.getValue("sku") as string | null;
        return sku
          ? <span className="text-neutral-600 text-sm font-mono truncate">{sku}</span>
          : <span className="text-neutral-600">—</span>;
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => <SortHeader column={column} label="In Stock" />,
      size: 80,
      minSize: 70,
      maxSize: 80,
      cell: ({ row }) => {
        const m = row.original;
        return <span className="text-neutral-700 whitespace-nowrap">{m.quantity}</span>;
      },
    },
    {
      accessorKey: "unit_type",
      header: ({ column }) => <SortHeader column={column} label="Unit Type" />,
      size: 90,
      minSize: 70,
      maxSize: 90,
      cell: ({ row }) => <span className="text-neutral-700 truncate">{row.getValue("unit_type")}</span>,
    },
    {
      accessorKey: "is_low_stock",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Status</span>,
      size: 110,
      minSize: 110,
      cell: ({ row }) => {
        const m = row.original;
        const qty = parseFloat(m.quantity ?? '0');
        if (qty === 0) return (
          <Badge variant="outline" className="text-red-800 border-red-400 bg-red-100 whitespace-nowrap">Out of Stock</Badge>
        );
        if (m.is_low_stock) return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 whitespace-nowrap">Low Stock</Badge>
        );
        return (
          <Badge variant="outline" className="text-green-800 border-green-400 bg-green-100 whitespace-nowrap">OK</Badge>
        );
      },
      filterFn: (row, _, filterValue) => {
        const m = row.original as RawMaterial;
        const qty = parseFloat(m.quantity ?? '0');
        if (filterValue === "out") return qty === 0;
        if (filterValue === "low") return m.is_low_stock && qty > 0;
        if (filterValue === "ok") return !m.is_low_stock && qty > 0;
        return true;
      },
    },
    {
      accessorKey: "brand",
      header: ({ column }) => <SortHeader column={column} label="Brand" />,
      size: 100,
      minSize: 80,
      maxSize: 100,
      cell: ({ row }) => <span className="text-neutral-700 truncate">{row.getValue("brand") ?? "—"}</span>,
    },
    {
      accessorKey: "source",
      header: ({ column }) => <SortHeader column={column} label="Source" />,
      size: 100,
      minSize: 80,
      maxSize: 100,
      cell: ({ row }) => <span className="text-neutral-700 truncate">{row.getValue("source") ?? "—"}</span>,
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
            {tags.slice(0, 2).map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
            {tags.length > 2 && <Badge variant="secondary" className="text-xs">+{tags.length - 2}</Badge>}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      size: 48,
      minSize: 48,
      maxSize: 48,
      cell: ({ row }) => {
        const material = row.original;
        return (
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label="Restock / Use" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setLogTarget(material)}>
                  Restock / Use
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Restock / Use</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button aria-label="History" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setHistoryTarget(material)}>
                  <History className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>History</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="More Actions"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => navigate(`/studio/materials/${material.id}`)}
                >
                  <EllipsisVertical className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p>More Actions</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="Delete"
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

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-8">Loading materials…</p>;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-3">

        {/* SEARCH */}
        <div className="w-full sm:w-[320px] md:w-[420px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search materials by name, SKU, brand, source, supplier"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8 h-8 w-full text-sm"
            />
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">

          <select
            aria-label="Status Filter"
            value={(table.getColumn("is_low_stock")?.getFilterValue() as string) ?? ""}
            onChange={(e) => {
              const col = table.getColumn("is_low_stock");
              col?.setFilterValue(e.target.value || undefined);
            }}
            className="h-8 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock {lowStockCount > 0 ? `(${lowStockCount})` : ""}</option>
            <option value="out">Out of Stock {outOfStockCount > 0 ? `(${outOfStockCount})` : ""}</option>
          </select>

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
                        <CommandItem key={tag} value={tag} onSelect={() => toggleTag(tag)}>
                          <Check
                            className={cn(
                              "mr-2 size-3",
                              selectedTags.includes(tag) ? "opacity-100" : "opacity-0"
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

          {/* active tags */}
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
            {table.getFilteredRowModel().rows.length} of {materials.length} materials
          </span>

          <Button
            aria-label="Add Material"
            size="sm"
            onClick={() => setShowCreate(true)}
            className="w-full sm:w-auto"
          >
            + Add Material
          </Button>
        </div>

      </div>

      {/* ── Table ── */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg: any) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header: any) => (
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
                  {materials.length === 0
                    ? `No materials yet — click "+ Add Material" to get started.`
                    : "No materials match your search."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row: any) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.columnDef.size }}
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
          <Button aria-label="Previous" variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
          <Button aria-label="Next" variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreate && (
        <CreateMaterialModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); refetchMaterials(); }} />
      )}
      {editTarget && (
        <CreateMaterialModal material={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); refetchMaterials(); }} />
      )}
      {logTarget && (
        <RestockDeductModal material={logTarget} onClose={() => setLogTarget(null)} onSaved={() => { setLogTarget(null); refetchMaterials(); }} />
      )}
      {historyTarget && (
        <MaterialHistoryModal material={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
      {deleteTarget && (
        <DeleteMaterialModal
          material={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); refetchMaterials(); }}
        />
      )}
    </div>
  );
}