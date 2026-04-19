import { lazy, Suspense, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  getMaterials,
  deleteMaterial,
} from "../../services/inventoryApi";
import { RawMaterial } from "../../types/inventory";

// Lazy load modals and big components to speed up initial render
const MaterialFormModal = lazy(() => import("./MaterialFormModal"));
const RestockDeductModal = lazy(() => import("./RestockDeductModal"));
const MaterialHistoryModal = lazy(() => import("./MaterialHistoryModal"));
const MaterialDetailModal = lazy(() => import("./MaterialDetailModal"));
const MaterialsTable = lazy(() => import("./MaterialsTable"));

export default function MaterialsTab() {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<RawMaterial | null>(null);
  const [logTarget, setLogTarget] = useState<RawMaterial | null>(null);
  const [historyTarget, setHistoryTarget] = useState<RawMaterial | null>(null);
  const [detailTarget, setDetailTarget] = useState<RawMaterial | null>(null);

  const fetchMaterials = async () => {
    try {
      const data = await getMaterials();
      setMaterials(data.results ?? data);
    } catch {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleDelete = async (material: RawMaterial) => {
    const confirmed = window.confirm(`Delete "${material.name}"?`);
    if (!confirmed) return;
    try {
      await deleteMaterial(material.id);
      toast.success("Material deleted");
      fetchMaterials();
    } catch (err: any) {
      toast.error(
        err.message?.includes("linked")
          ? "Remove this material from all projects before deleting."
          : "Failed to delete material"
      );
    }
  };

  if (loading) return <div className="inv-empty">Loading materials...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateModal(true)}>+ Add Material</Button>
        </div>
      </div>

      <Suspense fallback={<div className="p-4">Loading...</div>}>
        <MaterialsTable
            materials={[
            ...materials.filter((m) => m.is_low_stock),
            ...materials.filter((m) => !m.is_low_stock),
          ]}
          onEdit={setEditTarget}
          onRestockDeduct={setLogTarget}
          onHistory={setHistoryTarget}
          onMoreDetails={setDetailTarget}
          onDelete={handleDelete}
        />
      </Suspense>

      {showCreateModal && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <MaterialFormModal
            onClose={() => setShowCreateModal(false)}
            onSaved={() => { setShowCreateModal(false); fetchMaterials(); }}
          />
        </Suspense>
      )}
      {editTarget && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <MaterialFormModal
            material={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={() => { setEditTarget(null); fetchMaterials(); }}
          />
        </Suspense>
      )}
      {logTarget && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <RestockDeductModal
            material={logTarget}
            onClose={() => setLogTarget(null)}
            onSaved={() => { setLogTarget(null); fetchMaterials(); }}
          />
        </Suspense>
      )}
      {historyTarget && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <MaterialHistoryModal
            material={historyTarget}
            onClose={() => setHistoryTarget(null)}
          />
        </Suspense>
      )}
      {detailTarget && (
        <Suspense fallback={<div className="p-4">Loading...</div>}>
          <MaterialDetailModal
            material={detailTarget}
            onClose={() => setDetailTarget(null)}
            onSaved={() => { setDetailTarget(null); fetchMaterials(); }}
          />
        </Suspense>
      )}
    </div>
  );
}