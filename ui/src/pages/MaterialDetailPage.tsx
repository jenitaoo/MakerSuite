import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { ArrowLeft, Pencil, ImageIcon, History } from "lucide-react";

import { getMaterial } from "../services/inventoryApi";
import type { RawMaterial } from "../types/inventory";

const EditMaterialModal = lazy(() => import("../components/inventory/EditMaterialModal"));
const MaterialHistoryModal = lazy(() => import("../components/inventory/MaterialHistoryModal"));

export default function MaterialDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const materialId = Number(id);

  const [material, setMaterial] = useState<RawMaterial | null>(null);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Helper to display a dash for empty values
  const dash = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "—" : String(v);

  const fetchMaterial = useCallback(async () => {
    try {
      const data = await getMaterial(materialId);
      setMaterial(data);
    } catch {
      toast.error("Failed to load material");
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    fetchMaterial();
  }, [fetchMaterial]);

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (!material) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      <button
        aria-label="Go back to studio"
        onClick={() => navigate("/studio")}
        className="text-sm flex items-center gap-1 text-white hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* HEADER */}
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{material.name}</h1>

          <div className="flex gap-2 mt-2">
            <Badge variant="outline">
              {material.is_low_stock ? "Low Stock" : "In Stock"}
            </Badge>
            <span className="text-white text-sm">
              {material.quantity} {material.unit_type}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button aria-label="View material history" onClick={() => setShowHistory(true)}>
            <History className="w-4 h-4 mr-1" />
            History
          </Button>

          <Button aria-label="Edit material" onClick={() => setShowEdit(true)}>
            <Pencil className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* DETAILS */}
      <div className="grid md:grid-cols-2 gap-4">

        <Card className="bg-white overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center justify-center h-[500px] w-full">

                {material.photo_url ? (
                    <img
                    src={material.photo_url}
                    alt={material.name}
                    className="w-full h-full object-contain rounded-lg"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-neutral-400 py-12">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-xs">No image</span>
                    </div>
                )}

                </div>
            </CardContent>
        </Card>
        <Card className="bg-white border-neutral-200">
        <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">

            {/* Name */}
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Name
                </p>
                <p className="font-medium text-neutral-800">
                {dash(material.name)}
                </p>
            </div>

            {/* Unit Type */}
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Unit Type
                </p>
                <p className="font-medium text-neutral-800">
                {dash(material.unit_type)}
                </p>
            </div>

            {/* Quantity */}
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Quantity
                </p>
                <p className="font-medium text-neutral-800">
                {material.quantity != null
                    ? `${material.quantity} ${dash(material.unit_type)}`
                    : "—"}
                </p>
            </div>

            {/* Low stock */}
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Low Stock Threshold
                </p>
                <p className="font-medium text-neutral-800">
                {dash(material.low_stock_threshold)}
                </p>
            </div>

            {/* Cost per unit */}
            <div className="space-y-1 sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Cost Per Unit
                </p>
                <p className="font-medium text-neutral-800">
                {material.cost_per_unit != null
                    ? `€${material.cost_per_unit}`
                    : "—"}
                </p>
            </div>

            {/* Brand */}
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Brand
                </p>
                <p className="font-medium text-neutral-800">
                {dash(material.brand)}
                </p>
            </div>

            {/* Source */}
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Source
                </p>
                <p className="font-medium text-neutral-800">
                {dash(material.source)}
                </p>
            </div>

            {/* Supplier */}
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Supplier
                </p>
                <p className="font-medium text-neutral-800">
                {dash(material.supplier)}
                </p>
            </div>

            {/* SKU */}
            <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                SKU
                </p>
                <p className="font-medium text-neutral-800">
                {dash(material.sku)}
                </p>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Notes
                </p>

                <div className="min-h-[120px] p-3 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-800 whitespace-pre-wrap">
                {material.notes?.trim() ? material.notes : "—"}
                </div>
            </div>

            </div>
        </CardContent>
        </Card>
      </div>

      {/* NOTES */}
      {material.notes && (
        <Card className="bg-white">
          <CardContent className="p-6">
            <p className="whitespace-pre-wrap text-neutral-700">
              {material.notes}
            </p>
          </CardContent>
        </Card>
      )}

      {/* MODALS */}
      <Suspense fallback={null}>

        {showEdit && (
          <EditMaterialModal
            material={material}
            onClose={() => setShowEdit(false)}
            onSaved={() => {
              setShowEdit(false);
              fetchMaterial();
            }}
          />
        )}

        {showHistory && (
          <MaterialHistoryModal
            material={material}
            onClose={() => setShowHistory(false)}
          />
        )}

      </Suspense>
    </div>
  );
}