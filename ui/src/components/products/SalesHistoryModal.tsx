import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCookie } from "../../services/api";
import { Product } from "../../types/product";
import { SaleLog } from "../../types/inventory";

type Props = {
  product: Product;
  onClose: () => void;
};

export default function SalesHistoryModal({ product, onClose }: Props) {
  const [saleLogs, setSaleLogs] = useState<SaleLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${product.id}/sales/`, {
      credentials: "include",
      headers: { Accept: "application/json", "X-CSRFToken": getCookie("csrftoken") ?? "" },
    })
      .then((r) => r.json())
      .then((data) => setSaleLogs(data.results ?? data))
      .catch(() => toast.error("Failed to load sales history"))
      .finally(() => setLoading(false));
  }, [product.id]);

  const totalRevenue = saleLogs.reduce((sum, log) => {
    return sum + (log.sale_price ? parseFloat(log.sale_price) : 0);
  }, 0);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-[#fdf8f6]">
        <DialogHeader className="pb-3">
          <DialogTitle>Sales History — {product.title}</DialogTitle>
        </DialogHeader>

        {!loading && saleLogs.length > 0 && (
          <div className="flex gap-6 text-sm px-1 pb-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Sold</p>
              <p className="font-medium">{saleLogs.reduce((sum, l) => sum + l.units_sold, 0)} units</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Revenue</p>
              <p className="font-medium">€{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-1">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : saleLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No sales logged yet.</p>
          ) : (
            saleLogs.map((log) => (
            <div key={log.id} className="rounded-md border border-border bg-white p-3 text-sm space-y-1">
                <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                    <p className="font-medium">
                    {log.units_sold} unit{log.units_sold !== 1 ? "s" : ""} sold
                    {log.sale_price && <span className="ml-2 text-[hsl(var(--primary))]">€{log.sale_price}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                    {new Date(log.sale_date).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                </div>
                <Badge variant="outline" className={
                    log.source === "etsy"
                    ? "text-blue-600 border-blue-300 bg-blue-50 shrink-0"
                    : "text-gray-500 border-gray-200 bg-gray-50 shrink-0"
                }>
                    {log.source === "etsy" ? "Etsy" : "Manual"}
                </Badge>
                </div>
                {log.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {log.tags.map((t) => (
                    <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>
                    ))}
                </div>
                )}
            </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}