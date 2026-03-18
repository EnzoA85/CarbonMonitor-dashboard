import { environment } from '../../../environments/environment';

function getApiBaseUrl(): string {
  return (environment.apiUrl ?? 'http://localhost:8080/api').replace(/\/+$/, '');
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

function buildHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types API ─────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  email: string;
  role: string;
}

export interface UserResponse {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

export interface SiteResponse {
  id: number;
  name: string;
  location: string | null;
  surface: number | null;
  parkingSpaces: number | null;
  employees: number | null;
  energyConsumption: number | null;
  createdAt: string | null;
  createdBy: string | null;
}

export interface MaterialResponse {
  id: number;
  name: string;
  emissionFactor: number;
  unit?: string;
}

export interface SiteMaterialResponse {
  id: number;
  siteId: number;
  material: MaterialResponse;
  quantity: number;
  calculatedEmission: number;
}

export interface CarbonResultResponse {
  id: number;
  siteId: number;
  constructionEmission: number;
  exploitationEmission: number;
  totalEmission: number;
  co2PerM2: number;
  co2PerEmployee: number;
  calculatedAt: string;
}

export interface SiteHistoryResponse {
  id: number;
  siteId: number;
  year: number;
  energyConsumption: number | null;
  employees: number | null;
  totalEmission: number | null;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function apiLogin(payload: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(buildUrl('/auth/login'), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse<AuthResponse>(res);
}

export async function apiRegister(payload: { email: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(buildUrl('/auth/register'), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  return parseResponse<AuthResponse>(res);
}

export async function apiGetCurrentUser(token: string): Promise<UserResponse> {
  const res = await fetch(buildUrl('/auth/me'), {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return parseResponse<UserResponse>(res);
}

// ─── Sites ────────────────────────────────────────────────────────────────

export async function apiListSites(token: string): Promise<SiteResponse[]> {
  const res = await fetch(buildUrl('/sites'), {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return parseResponse<SiteResponse[]>(res);
}

export async function apiGetSite(token: string, id: number): Promise<SiteResponse> {
  const res = await fetch(buildUrl(`/sites/${id}`), {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return parseResponse<SiteResponse>(res);
}

export async function apiCreateSite(
  token: string,
  payload: {
    name: string;
    location?: string;
    surface: number;
    parkingSpaces?: number;
    employees: number;
    energyConsumption?: number;
  }
): Promise<SiteResponse> {
  const res = await fetch(buildUrl('/sites'), {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({
      name: payload.name,
      location: payload.location ?? '',
      surface: payload.surface,
      parkingSpaces: payload.parkingSpaces ?? 0,
      employees: payload.employees,
      energyConsumption: payload.energyConsumption ?? 0,
    }),
  });
  return parseResponse<SiteResponse>(res);
}

export async function apiUpdateSite(
  token: string,
  id: number,
  payload: {
    name: string;
    location?: string;
    surface: number;
    parkingSpaces?: number;
    employees: number;
    energyConsumption?: number;
  }
): Promise<SiteResponse> {
  const res = await fetch(buildUrl(`/sites/${id}`), {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify({
      name: payload.name,
      location: payload.location ?? '',
      surface: payload.surface,
      parkingSpaces: payload.parkingSpaces ?? 0,
      employees: payload.employees,
      energyConsumption: payload.energyConsumption ?? 0,
    }),
  });
  return parseResponse<SiteResponse>(res);
}

export async function apiDeleteSite(token: string, id: number): Promise<void> {
  const res = await fetch(buildUrl(`/sites/${id}`), {
    method: 'DELETE',
    headers: buildHeaders(token),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
}

// ─── Materials ─────────────────────────────────────────────────────────────

export async function apiListMaterials(token: string): Promise<MaterialResponse[]> {
  const res = await fetch(buildUrl('/materials'), {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return parseResponse<MaterialResponse[]>(res);
}

export async function apiGetSiteMaterials(token: string, siteId: number): Promise<SiteMaterialResponse[]> {
  const res = await fetch(buildUrl(`/sites/${siteId}/materials`), {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return parseResponse<SiteMaterialResponse[]>(res);
}

export async function apiAddSiteMaterial(
  token: string,
  siteId: number,
  payload: { materialId: number; quantity: number }
): Promise<SiteMaterialResponse> {
  const res = await fetch(buildUrl(`/sites/${siteId}/materials`), {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  return parseResponse<SiteMaterialResponse>(res);
}

export async function apiRemoveSiteMaterial(
  token: string,
  siteId: number,
  siteMaterialId: number
): Promise<void> {
  const res = await fetch(buildUrl(`/sites/${siteId}/materials/${siteMaterialId}`), {
    method: 'DELETE',
    headers: buildHeaders(token),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
}

// ─── Carbon ───────────────────────────────────────────────────────────────

export async function apiCalculateSite(token: string, siteId: number): Promise<CarbonResultResponse> {
  const res = await fetch(buildUrl(`/sites/${siteId}/calculate`), {
    method: 'POST',
    headers: buildHeaders(token),
  });
  return parseResponse<CarbonResultResponse>(res);
}

export async function apiGetSiteReport(token: string, siteId: number): Promise<CarbonResultResponse> {
  const res = await fetch(buildUrl(`/sites/${siteId}/report`), {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return parseResponse<CarbonResultResponse>(res);
}

// ─── History ───────────────────────────────────────────────────────────────

export async function apiGetSiteHistory(token: string, siteId: number): Promise<SiteHistoryResponse[]> {
  const res = await fetch(buildUrl(`/sites/${siteId}/history`), {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return parseResponse<SiteHistoryResponse[]>(res);
}
