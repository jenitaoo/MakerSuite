import {
  useState,
  useMemo,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  Column,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, X } from "lucide-react";
import { RawMaterial } from "../../types/inventory";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  materials: RawMaterial[];
  onEdit: (material: RawMaterial) => void;
  onRestockDeduct: (material: RawMaterial) => void;
  onHistory: (material: RawMaterial) => void;
  onMoreDetails: (material: RawMaterial) => void;
  onDelete: (material: RawMaterial) => void;
};

export default function MaterialsTable({
  materials,
  onEdit,
  onRestockDeduct,
  onHistory,
  onMoreDetails,
  onDelete,
}: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // All unique tags across all materials
  const allTags = useMemo(
    () => [...new Set(materials.flatMap((m) => m.tags ?? []))].sort(),
    [materials]
  );

  // Filter materials by selected tags (OR — any match)
  const filteredByTags = useMemo(() => {
    if (selectedTags.length === 0) return materials;
    return materials.filter((m) =>
      selectedTags.some((tag) => (m.tags ?? []).includes(tag))
    );
  }, [materials, selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const columns: ColumnDef<RawMaterial>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }: { column: Column<RawMaterial> }) => (
        <button
          className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "unit_type",
      header: ({ column }: { column: Column<RawMaterial> }) => (
        <button
          className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Unit Type
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      ),
    },
    {
      accessorKey: "quantity",
      header: ({ column }: { column: Column<RawMaterial> }) => (
        <button
          className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          In Stock
          {column.getIsSorted() === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : column.getIsSorted() === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      ),
      cell: ({ row }) => {
        const material = row.original;
        return (
          <span>
            {material.quantity} {material.unit_type}
          </span>
        );
      },
    },
    {
      accessorKey: "is_low_stock",
      header: () => (
        <span className="font-medium text-xs uppercase tracking-wide">Stock Status</span>
      ),
      cell: ({ row }: { row: any }) =>
        row.getValue("is_low_stock") ? (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            Low Stock
          </Badge>
        ) : (
          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
            OK
          </Badge>
        ),
      filterFn: (row: any, _: any, filterValue: any) => {
        if (filterValue === "low") return row.getValue("is_low_stock") === true;
        return true;
      },
    },
    {
      accessorKey: "brand",
      header: () => (
        <span className="font-medium text-xs uppercase tracking-wide">Brand</span>
      ),
      cell: ({ row }: { row: any }) => row.getValue("brand") ?? "—",
    },
    {
      accessorKey: "source",
      header: () => (
        <span className="font-medium text-xs uppercase tracking-wide">Source</span>
      ),
      cell: ({ row }: { row: any }) => row.getValue("source") ?? "—",
    },
    {
      accessorKey: "tags",
      header: () => (
        <span className="font-medium text-xs uppercase tracking-wide">Tags</span>
      ),
      cell: ({ row }: { row: any }) => {
        const tags: string[] = row.getValue("tags") ?? [];
        if (tags.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => (
        <span className="font-medium text-xs uppercase tracking-wide">Actions</span>
      ),
      cell: ({ row }: { row: any }) => {
        const material = row.original;
        return (
          <div className="flex gap-1 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => onRestockDeduct(material)}>
              Restock / Use
            </Button>
            <Button variant="outline" size="sm" onClick={() => onHistory(material)}>
              History
            </Button>
            <Button variant="outline" size="sm" onClick={() => onMoreDetails(material)}>
              Details
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(material)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 border-red-200"
              onClick={() => onDelete(material)}
            >
              Delete
            </Button>
          </div>
        );
      },
    },
  ], [onEdit, onRestockDeduct, onHistory, onMoreDetails, onDelete]);

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            placeholder="🔎︎ Search materials..."
            value={globalFilter}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGlobalFilter(e.target.value)}
            className="w-56 h-8 text-sm"
          />

          {/* Low stock filter */}
          <Button
            variant={
              (table.getColumn("is_low_stock")?.getFilterValue() as string) === "low"
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => {
              const col = table.getColumn("is_low_stock");
              const current = col?.getFilterValue();
              col?.setFilterValue(current === "low" ? undefined : "low");
            }}
            className="h-8 text-xs"
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
                  Tags
                  {selectedTags.length > 0 && (
                    <span className="bg-primary-foreground/20 text-primary-foreground rounded-none px-1">
                      {selectedTags.length}
                    </span>
                  )}
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
                  <div className="border-t border-border p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs text-muted-foreground"
                      onClick={() => setSelectedTags([])}
                    >
                      <X className="size-3 mr-1" />
                      Clear filters
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Active tag chips */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs gap-1 pr-1 cursor-pointer"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                  <X className="size-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <span className="text-sm text-gray-500">
          {table.getFilteredRowModel().rows.length} of {materials.length} materials
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => (
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
                <TableCell colSpan={columns.length} className="text-center py-12 text-gray-400">
                  {materials.length === 0
                    ? "No materials yet — click \"Add Material\" to get started."
                    : "No materials match your search."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row: any) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell: any) => (
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}