import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { getProjects, deleteProject, getProject } from "../../services/inventoryApi";
import { Project } from "../../types/inventory";
import CreateProjectModal from "./CreateProjectModal";
import LogMakeModal from "./LogMakeModal";
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

  const handleLogAction = async (project: Project) => {
    try {
      const fresh = await getProject(project.id);
      setLogTarget(fresh);
    } catch {
      setLogTarget(project);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (project: Project) => {
    const confirmed = window.confirm(`Delete "${project.name}"? This will also delete all linked makes and inventory logs.`);
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {projects.length > 0 && (
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              defaultValue=""
              onChange={async (e) => {
                if (!e.target.value) return;
                const project = projects.find((p) => p.id === Number(e.target.value));
                if (project) await handleLogAction(project);
                e.target.value = "";
              }}
            >
              <option value="" disabled>Log a Make →</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <Button variant="outline" onClick={() => setShowCreate(true)}>+ New Project</Button>
        </div>
      </div>

      <ProjectsTable
        projects={projects}
        onDelete={handleDelete}
        onLogAction={handleLogAction}
        onHistory={setHistoryTarget}
        onMaterials={setMaterialsTarget}
        onEdit={setEditTarget}
      />

      {showCreate && (
        <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchProjects(); }} />
      )}
      {logTarget && (
        <LogMakeModal
          project={logTarget}
          onClose={() => setLogTarget(null)}
          onLogged={() => { setLogTarget(null); fetchProjects(); }}
        />
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