import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Shown when an Etsy listing exists but is in draft/inactive state.
 * Etsy listings created via the API start as drafts — the seller must
 * go to Etsy to publish them so buyers can see them.
 */
export function EtsyDraftBadge() {
  return (
    <Badge
      variant="outline"
      className="text-amber-600 border-amber-300 bg-amber-50 text-xs gap-1 cursor-help"
      title="This listing was pushed to Etsy as a draft. It's not visible to buyers yet. Go to Etsy to publish it."
    >
      <Info className="size-3" />
      Draft on Etsy
    </Badge>
  );
}