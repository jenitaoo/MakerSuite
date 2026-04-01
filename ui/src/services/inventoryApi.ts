import { getCookie } from "./api";

const BASE = "/api/inventory";

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

export async function createMaterial(data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/materials/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateMaterial(id: number, data: Record<string, unknown>) {
  const res = await fetch(`${BASE}/materials/${id}/`, {
    method: "PATCH",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(data),
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

export async function logMake(
  id: number,
  data: {
    units_made: number;
    date_made?: string;
    deduct_materials?: boolean;
    notes?: string;
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