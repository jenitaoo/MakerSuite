import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import { deleteProject } from "../../services/inventoryApi";

type Props = {
  project: { id: number; name: string };
  onClose: () => void;
  onDeleted: () => void;
};

export default function DeleteProjectModal({ project, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success(`"${project.name}" deleted`);
      onDeleted();
    } catch {
      toast.error("Failed to delete project");
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#fdf8f6]">
        <DialogHeader>
          <DialogTitle>Delete "{project.name}"?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm text-muted-foreground">
          <p>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">"{project.name}"</span> from
            MakerSuite, including all make logs.
          </p>
          <p className="text-destructive font-medium">This action cannot be undone.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
          <Button
            variant="destructive"
            style={{ backgroundColor: "#b84141", color: "#ffffff" }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}