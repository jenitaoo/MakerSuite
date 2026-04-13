import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCookie } from "../../services/api";
import { persistentSuccess, persistentError } from "../../utils/toast-utils";
import { Product } from "../../types/product";

type Props = {
  product: Product;
  hasEtsyListing: boolean;
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteProductModal({ product, hasEtsyListing, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    let etsyDeactivated = false;
    let etsyError: string | null = null;

    // Step 1: deactivate on Etsy if linked
    if (hasEtsyListing) {
      try {
        const res = await fetch(`/api/products/${product.id}/deactivate-etsy/`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-CSRFToken": getCookie("csrftoken") ?? "",
          },
        });
        const data = await res.json();
        if (res.ok && data.status !== "no_listing") {
          etsyDeactivated = true;
        } else if (!res.ok) {
          etsyError = data.error ?? "Failed to deactivate on Etsy";
        }
      } catch {
        etsyError = "Could not reach Etsy";
      }
    }

    // Step 2: delete internally regardless of Etsy result
    try {
      const res = await fetch(`/api/products/${product.id}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
      });

      if (!res.ok) {
        persistentError("Failed to delete product from MakerSuite.");
        setDeleting(false);
        return;
      }

      // Show appropriate persistent toast based on outcome
      if (hasEtsyListing && etsyDeactivated) {
        persistentSuccess(
          `"${product.title}" has been removed from MakerSuite. Your Etsy listing has been deactivated — it's no longer visible to buyers but remains in your Etsy account as a draft. Go to Etsy to permanently delete it.`
        );
      } else if (hasEtsyListing && etsyError) {
        persistentError(
          `"${product.title}" was removed from MakerSuite, but we couldn't deactivate the Etsy listing (${etsyError}). Please deactivate it manually on Etsy.`
        );
      } else {
        persistentSuccess(`"${product.title}" has been removed from MakerSuite.`);
      }

      onDeleted();
    } catch {
      persistentError("Failed to delete product. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Delete "{product.title}"?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <p>
            This will permanently remove <span className="font-medium text-foreground">"{product.title}"</span> from MakerSuite, including all photos and listing data.
          </p>

          {hasEtsyListing && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 space-y-1">
              <p className="font-medium">This product has an Etsy listing.</p>
              <p>
                Your Etsy listing will be <span className="font-medium">deactivated</span> (set to draft) — it won't be visible to buyers, but it will remain in your Etsy account. You'll need to go to Etsy to permanently delete it from there.
              </p>
            </div>
          )}

          <p className="text-destructive font-medium">This action cannot be undone.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            style={{ backgroundColor: "#b84141", color: "#ffffff" }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting
              ? "Deleting..."
              : hasEtsyListing
              ? "Delete & Deactivate on Etsy"
              : "Delete Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}