import type { Building, ExtractionResult, Property, Unit } from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Properties
export const api = {
  properties: {
    list: () => request<Property[]>('/properties'),
    get: (id: string) => request<Property>(`/properties/${id}`),
    create: (data: Partial<Property>) =>
      request<Property>('/properties', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Property>) =>
      request<Property>(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/properties/${id}`, { method: 'DELETE' }),
    publish: (id: string) =>
      request<Property>(`/properties/${id}/publish`, { method: 'POST' }),
  },

  buildings: {
    create: (propertyId: string, data: Partial<Building>) =>
      request<Building>(`/properties/${propertyId}/buildings`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Building>) =>
      request<Building>(`/buildings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/buildings/${id}`, { method: 'DELETE' }),
  },

  units: {
    create: (buildingId: string, data: Partial<Unit>) =>
      request<Unit>(`/buildings/${buildingId}/units`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    bulkCreate: (buildingId: string, units: Partial<Unit>[]) =>
      request<Unit[]>(`/buildings/${buildingId}/units/bulk`, {
        method: 'POST',
        body: JSON.stringify({ units }),
      }),
    update: (id: string, data: Partial<Unit>) =>
      request<Unit>(`/units/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/units/${id}`, { method: 'DELETE' }),
  },

  extraction: {
    trigger: (propertyId: string, file: File) => {
      const form = new FormData();
      form.append('file', file);
      return fetch(`${BASE}/properties/${propertyId}/extract`, {
        method: 'POST',
        body: form,
      }).then((r) => r.json());
    },
    get: (propertyId: string) =>
      request<ExtractionResult>(`/properties/${propertyId}/extraction`),
    apply: (propertyId: string, data?: unknown) =>
      request<Property>(`/properties/${propertyId}/extraction/apply`, {
        method: 'POST',
        body: data ? JSON.stringify({ raw_result: data }) : undefined,
      }),
  },
};
