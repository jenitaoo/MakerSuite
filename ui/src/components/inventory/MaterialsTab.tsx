import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  getMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  restockMaterial,
  deductMaterial,
  getMaterialLogs,
} from "../../services/inventoryApi";
import { RawMaterial, InventoryLog } from "../../types/inventory";
import MaterialsTable from "./MaterialsTable";
import MaterialFormModal from "./MaterialFormModal";
import RestockDeductModal from "./RestockDeductModal";
import MaterialHistoryModal from "./MaterialHistoryModal";
import MaterialDetailModal from "./MaterialDetailModal";

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
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateModal(true)}>
          + Add Material
        </Button>
      </div>

      <MaterialsTable
        materials={materials}
        onEdit={setEditTarget}
        onRestockDeduct={setLogTarget}
        onHistory={setHistoryTarget}
        onMoreDetails={setDetailTarget}
        onDelete={handleDelete}
      />

      {showCreateModal && (
        <MaterialFormModal
          existingTags={[...new Set(materials.flatMap((m) => m.tags ?? []))]}
          onClose={() => setShowCreateModal(false)}
          onSaved={() => { setShowCreateModal(false); fetchMaterials(); }}
        />
      )}
      {editTarget && (
        <MaterialFormModal
          material={editTarget}
          existingTags={[...new Set(materials.flatMap((m) => m.tags ?? []))]}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); fetchMaterials(); }}
        />
      )}
      {logTarget && (
        <RestockDeductModal
          material={logTarget}
          onClose={() => setLogTarget(null)}
          onSaved={() => { setLogTarget(null); fetchMaterials(); }}
        />
      )}
      {historyTarget && (
        <MaterialHistoryModal
          material={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
      {detailTarget && (
        <MaterialDetailModal
          material={detailTarget}
          onClose={() => setDetailTarget(null)}
          onSaved={() => { setDetailTarget(null); fetchMaterials(); }}
        />
      )}
    </div>
  );
}