import { getCookie, API_URL } from "./api";

const BASE = `${API_URL}/api/inventory`;

const headers = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  "X-CSRFToken": getCookie("csrftoken") ?? "",
});

// ── Raw Materials ─────────────────────────────────────────────

export async function getMaterials() {
  const res = await fetch(`${BASE}/materials/`, {
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createMaterial(data: Record<string, unknown>, photo?: File) {
  const formData = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      formData.append(k, JSON.stringify(v)); // tags array
    } else {
      formData.append(k, String(v));
    }
  });
  if (photo) formData.append("photo", photo);

  const res = await fetch(`${BASE}/materials/`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-CSRFToken": getCookie("csrftoken") ?? "",
      // no Content-Type — browser sets multipart boundary
    },
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateMaterial(id: number, data: Record<string, unknown>, photo?: File) {
  const formData = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    if (Array.isArray(v)) {
      formData.append(k, JSON.stringify(v));
    } else {
      formData.append(k, String(v));
    }
  });
  if (photo) formData.append("photo", photo);

  const res = await fetch(`${BASE}/materials/${id}/`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-CSRFToken": getCookie("csrftoken") ?? "",
    },
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteMaterial(id: number) {
  const res = await fetch(`${BASE}/materials/${id}/`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function restockMaterial(id: number, quantity: number, notes?: string) {
  const res = await fetch(`${BASE}/materials/${id}/restock/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify({ quantity, notes }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deductMaterial(id: number, quantity: number, notes?: string) {
  const res = await fetch(`${BASE}/materials/${id}/deduct/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify({ quantity, notes }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMaterialLogs(id: number) {
  const res = await fetch(`${BASE}/materials/${id}/logs/`, {
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Projects ──────────────────────────────────────────────────

export async function getProjects() {
  const res = await fetch(`${BASE}/projects/`, {
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProject(id: number) {
  const res = await fetch(`${BASE}/projects/${id}/`, {
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createProject(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/projects/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProject(id: number, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/projects/${id}/`, {
    method: "PATCH",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteProject(id: number) {
  const res = await fetch(`${BASE}/projects/${id}/`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function uploadProjectImage(projectId: number, file: File): Promise<{ id: number; image_url: string; order: number }> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(`${BASE}/projects/${projectId}/images/`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-CSRFToken": getCookie("csrftoken") ?? "",
      // no Content-Type — browser sets multipart boundary automatically
    },
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteProjectImage(projectId: number, imageId: number) {
  const res = await fetch(`${BASE}/projects/${projectId}/images/${imageId}/`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-CSRFToken": getCookie("csrftoken") ?? "",
    },
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function logMake(
  id: number,
  data: {
    units_made: number;
    date_made?: string;
    deduct_materials?: boolean;
    notes?: string;
    material_overrides?: { material_id: number; quantity_used: any }[] | undefined;
    duration_minutes?: number;
  }
) {
  const res = await fetch(`${BASE}/projects/${id}/log-make/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getMakeLogs(id: number) {
  const res = await fetch(`${BASE}/projects/${id}/make-logs/`, {
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function logSale(
  id: number,
  data: {
    units_sold: number;
    sale_date: string;
    tag_ids: number[];
    source: string;
    notes?: string;
    unit_prices?: { unit: number; price: string }[];
    sale_price?: string;
  }
) {
  const res = await fetch(`${BASE}/projects/${id}/log-sale/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProjectSales(
  id: number,
  filters?: { tags?: number[]; date_from?: string; date_to?: string }
) {
  const params = new URLSearchParams();
  if (filters?.tags) filters.tags.forEach((t) => params.append("tags", String(t)));
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);

  const res = await fetch(`${BASE}/projects/${id}/sales/?${params.toString()}`, {
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getProjectMaterials(id: number) {
  const res = await fetch(`${BASE}/projects/${id}/materials/`, {
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addProjectMaterial(
  id: number,
  material_id: number,
  quantity_used?: number
) {
  const res = await fetch(`${BASE}/projects/${id}/materials/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify({ material_id, quantity_used }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function removeProjectMaterial(projectId: number, materialId: number) {
  const res = await fetch(`${BASE}/projects/${projectId}/materials/${materialId}/`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── Sale Tags ─────────────────────────────────────────────────

export async function getTags() {
  const res = await fetch(`${BASE}/tags/`, {
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createTag(name: string) {
  const res = await fetch(`${BASE}/tags/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteTag(id: number) {
  const res = await fetch(`${BASE}/tags/${id}/`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function linkProductToProject(projectId: number, productId: number) {
  const res = await fetch(`${BASE}/projects/${projectId}/link-product/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify({ product_id: productId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}