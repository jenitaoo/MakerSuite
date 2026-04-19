import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCookie, API_URL } from "../../services/api";
import toast from "react-hot-toast";

type Market = { id: number; name: string };

type Props = {
  market: Market;
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteMarketModal({ market, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/markets/${market.id}/`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "X-CSRFToken": getCookie("csrftoken") ?? "",
        },
      });
      if (!res.ok) throw new Error();
      toast.success(`"${market.name}" deleted`);
      onDeleted();
    } catch {
      toast.error("Failed to delete market");
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Delete "{market.name}"?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <p>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">"{market.name}"</span> from
            MakerSuite, including all products brought and sales logged against it.
          </p>
          <p className="text-destructive font-medium">This action cannot be undone.</p>
        </div>

        <DialogFooter>
          <Button aria-label="Cancel" variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            aria-label="Delete market"
            variant="destructive"
            style={{ backgroundColor: "#b84141", color: "#ffffff" }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Market"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}