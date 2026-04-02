import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { getProjects, deleteProject } from "../../services/inventoryApi";
import { Project } from "../../types/inventory";
import CreateProjectModal from "./CreateProjectModal";
import LogMakeSaleModal from "./LogMakeSaleModal";
import ProjectsTable from "./ProjectsTable";

export default function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [logSaleTarget, setLogSaleTarget] = useState<Project | null>(null);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data.results ?? data);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This will also delete all linked makes, sales and inventory logs.`
    );
    if (!confirmed) return;
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  if (loading) return <div className="inv-empty">Loading projects...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)}>
          + New Project
        </Button>
      </div>

      <ProjectsTable
        projects={projects}
        onDelete={handleDelete}
        onLogSale={setLogSaleTarget}
      />

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchProjects(); }}
        />
      )}
      {logSaleTarget && (
        <LogMakeSaleModal
          project={logSaleTarget}
          onClose={() => setLogSaleTarget(null)}
          onLogged={() => { setLogSaleTarget(null); fetchProjects(); }}
        />
      )}
    </div>
  );
}