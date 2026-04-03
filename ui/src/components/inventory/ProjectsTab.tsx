import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { getProjects, deleteProject } from "../../services/inventoryApi";
import { Project } from "../../types/inventory";
import CreateProjectModal from "./CreateProjectModal";
import ProjectLogActionModal from "./ProjectLogActionModal";
import ProjectHistoryModal from "./ProjectHistoryModal";
import ProjectMaterialsModal from "./ProjectMaterialsModal";
import EditProjectModal from "./EditProjectModal";
import ProjectsTable from "./ProjectsTable";

export default function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [logTarget, setLogTarget] = useState<Project | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Project | null>(null);
  const [materialsTarget, setMaterialsTarget] = useState<Project | null>(null);
  const [editTarget, setEditTarget] = useState<Project | null>(null);

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
    const confirmed = window.confirm(`Delete "${project.name}"? This will also delete all linked makes, sales and inventory logs.`);
    if (!confirmed) return;
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      fetchProjects();
    } catch {
      toast.error("Failed to delete project");
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-8">Loading projects...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>+ New Project</Button>
      </div>

      <ProjectsTable
        projects={projects}
        onDelete={handleDelete}
        onLogAction={setLogTarget}
        onHistory={setHistoryTarget}
        onMaterials={setMaterialsTarget}
        onEdit={setEditTarget}
      />

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchProjects(); }} />
      )}
      {logTarget && (
        <ProjectLogActionModal project={logTarget} onClose={() => setLogTarget(null)} onLogged={() => { setLogTarget(null); fetchProjects(); }} />
      )}
      {historyTarget && (
        <ProjectHistoryModal project={historyTarget} onClose={() => setHistoryTarget(null)} />
      )}
      {materialsTarget && (
        <ProjectMaterialsModal project={materialsTarget} onClose={() => setMaterialsTarget(null)} onSaved={() => { setMaterialsTarget(null); fetchProjects(); }} />
      )}
      {editTarget && (
        <EditProjectModal project={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); fetchProjects(); }} />
      )}
    </div>
  );
}