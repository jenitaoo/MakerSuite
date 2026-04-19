import { lazy, Suspense, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { getProjects, deleteProject, getProject } from "../../services/inventoryApi";
import { Project } from "../../types/inventory";

// Lazy load modals and big components to speed up initial render
const CreateProjectModal = lazy(() => import("./CreateProjectModal"));
const LogMakeModal = lazy(() => import("./LogMakeModal"));
const MakeHistoryModal = lazy(() => import("./MakeHistoryModal"));
const ProjectMaterialsModal = lazy(() => import("./ProjectMaterialsModal"));
const EditProjectModal = lazy(() => import("./EditProjectModal"));
const ProjectsTable = lazy(() => import("./ProjectsTable"));

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
        <div className="flex items-center gap-2 flex-wrap">
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
          <Button onClick={() => setShowCreate(true)}>+ New Project</Button>
        </div>
      </div>

      <Suspense fallback={<div className="p-4">Loading...</div>}>
        <ProjectsTable
          projects={projects}
          onDelete={handleDelete}
          onLogAction={handleLogAction}
          onHistory={setHistoryTarget}
          onMaterials={setMaterialsTarget}
          onEdit={setEditTarget}
        />
      </Suspense>

      {showCreate && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchProjects(); }} />
        </Suspense>
      )}
      {logTarget && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <LogMakeModal
            project={logTarget}
            onClose={() => setLogTarget(null)}
            onLogged={() => { setLogTarget(null); fetchProjects(); }}
          />
        </Suspense>
      )}
      {historyTarget && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <MakeHistoryModal project={historyTarget} onClose={() => setHistoryTarget(null)} />
        </Suspense>
      )}
      {materialsTarget && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <ProjectMaterialsModal project={materialsTarget} onClose={() => setMaterialsTarget(null)} onSaved={() => { setMaterialsTarget(null); fetchProjects(); }} />
        </Suspense>
      )}
      {editTarget && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <EditProjectModal project={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); fetchProjects(); }} />
        </Suspense>
      )}
    </div>
  );
}