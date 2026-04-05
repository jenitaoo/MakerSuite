import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown, Info } from "lucide-react";
import { Product } from "../../types/product";
import DeleteProductModal from "./DeleteProductModal";

type ProductTableProps = {
  products: Product[];
  onEdit: (product: Product) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
  onDeleted: () => void;
};

// Draft badge shown when an Etsy listing exists but is not active
function DraftBadge() {
  return (
    <span className="inline-flex items-center gap-1">
      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-xs gap-1">
        Draft
        <span title="This listing was pushed to Etsy as a draft. Go to Etsy to publish it so buyers can see it.">
          <Info className="size-3 cursor-help" />
        </span>
      </Badge>
    </span>
  );
}

export default function ProductTable({ products, onEdit, onRefresh, onCreateNew, onDeleted }: ProductTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    if (platformFilter === "All") return products;
    return products.filter((p) => p.platforms.includes(platformFilter));
  }, [products, platformFilter]);

  const SortHeader = ({ column, label }: { column: any; label: string }) => (
    <button
      className="flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-black"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );

  const columns: ColumnDef<Product>[] = useMemo(() => [
    {
      accessorKey: "image_url",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Photo</span>,
      cell: ({ row }) => (
        <div className="w-14 h-14 rounded overflow-hidden bg-muted flex items-center justify-center text-xs text-muted-foreground">
          {row.original.image_url ? (
            <img src={row.original.image_url} alt={row.original.title} className="w-full h-full object-cover" />
          ) : (
            "No image"
          )}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => <SortHeader column={column} label="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue("title")}</span>,
    },
    {
      accessorKey: "internal_price",
      header: ({ column }) => <SortHeader column={column} label="Price" />,
      cell: ({ row }) => `€${row.getValue("internal_price")}`,
    },
    {
      accessorKey: "internal_quantity",
      header: ({ column }) => <SortHeader column={column} label="Qty" />,
    },
    {
      accessorKey: "platforms",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Platforms</span>,
      cell: ({ row }) => {
        const product = row.original;
        const platforms = product.platforms as string[];
        const etsyState = product.etsy_listing_state;
        const isEtsyDraft = platforms.includes("Etsy") && etsyState && etsyState !== "active";

        return (
          <div className="flex flex-wrap gap-1 items-center">
            {platforms.length > 0
              ? platforms.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1">
                    <Badge variant="secondary">{p}</Badge>
                    {p === "Etsy" && isEtsyDraft && <DraftBadge />}
                  </span>
                ))
              : <Badge variant="outline">MakerSuite</Badge>
            }
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: "actions",
      header: () => <span className="font-medium text-xs uppercase tracking-wide">Actions</span>,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>✏️</Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteTarget(row.original)}
          >
            🗑
          </Button>
        </div>
      ),
    },
  ], [onEdit]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Input
            placeholder="🔎︎ Search products..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full sm:w-56 h-8 text-sm"
          />
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-full sm:w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Platforms</SelectItem>
              <SelectItem value="Etsy">Etsy</SelectItem>
              <SelectItem value="MakerSuite">MakerSuite</SelectItem>
              <SelectItem value="Shopify" disabled>Shopify (coming soon)</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500 self-center">
            {table.getFilteredRowModel().rows.length} of {products.length} products
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button variant="outline" disabled className="hidden sm:block w-full sm:w-auto text-muted-foreground">
            Sync from Shopify
          </Button>
          <Button variant="outline" style={{ backgroundColor: "#fdf8f6" }} onClick={onRefresh} className="w-full sm:w-auto">
            Sync from Etsy
          </Button>
          <Button onClick={onCreateNew} className="w-full sm:w-auto">
            Create New Product
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
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
                <TableCell colSpan={columns.length} className="text-center py-12 text-gray-400">
                  {products.length === 0 ? "No products found ( • ᴖ • ｡)" : "No products match your search."}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteProductModal
          product={deleteTarget}
          hasEtsyListing={deleteTarget.platforms.includes("Etsy")}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            onDeleted();
          }}
        />
      )}
    </div>
  );
}