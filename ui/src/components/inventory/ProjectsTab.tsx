import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getProjects, deleteProject } from "../../services/inventoryApi";
import { Project } from "../../types/inventory";
import CreateProjectModal from "./CreateProjectModal";
import LogMakeSaleModal from "./LogMakeSaleModal";

export default function ProjectsTab() {
  const navigate = useNavigate();
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

  useEffect(() => {
    fetchProjects();
  }, []);

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

  const inStockBadge = (inStock: number) =>
    inStock > 0 ? (
      <span className="inv-badge inv-badge--success">{inStock}</span>
    ) : (
      <span className="inv-badge inv-badge--neutral">0</span>
    );

  if (loading) return <div className="inv-empty">Loading projects...</div>;

  return (
    <div>
      <div className="inv-toolbar">
        <div className="inv-toolbar__left">
          <span style={{ fontSize: "0.875rem", color: "#596780" }}>
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>
        <button
          type="button"
          className="inv-btn inv-btn--primary"
          onClick={() => setShowCreateModal(true)}
        >
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="inv-empty">
          No projects yet — click "New Project" to get started.
        </div>
      ) : (
        <div className="inv-table-wrapper">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Units Made</th>
                <th>In Stock</th>
                <th>Sold</th>
                <th>Linked Product</th>
                <th>Last Updated</th>
                <th>Actions</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#000000",
                        fontWeight: 500,
                        padding: 0,
                        textAlign: "left",
                        fontSize: "0.875rem",
                      }}
                      onClick={() => navigate(`/inventory/projects/${project.id}`)}
                    >
                      {project.name}
                    </button>
                  </td>
                  <td>{project.units_made}</td>
                  <td>{inStockBadge(project.in_stock)}</td>
                  <td>{project.units_sold}</td>
                  <td>
                    {project.product ? (
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => navigate(`/products/${project.product}/edit`)}
                      >
                        {project.product_title ?? `Product #${project.product}`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => navigate("/products/new")}
                      >
                        + Create Product
                      </button>
                    )}
                  </td>
                  <td style={{ color: "#596780", fontSize: "0.8rem" }}>
                    {new Date(project.updated_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm"
                        onClick={() => navigate(`/inventory/projects/${project.id}`)}
                      >
                        View Materials
                      </button>
                    </div>
                  </td>
                  <td>
                      <button
                        type="button"
                        className="inv-btn inv-btn--sm inv-btn--danger"
                        onClick={() => handleDelete(project)}
                      >
                        ✖
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchProjects();
          }}
        />
      )}

      {logSaleTarget && (
        <LogMakeSaleModal
          project={logSaleTarget}
          onClose={() => setLogSaleTarget(null)}
          onLogged={() => {
            setLogSaleTarget(null);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}