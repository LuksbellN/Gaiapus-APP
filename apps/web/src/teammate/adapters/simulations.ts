// Future-planning simulations (2027/2028): capabilities, regional publications, immutable runs and series from the API.
// Separate from adapters/index.ts on purpose; payloads are shown as published and texts come from stable codes.
import type { SimulationCatalog, SimulationPublicationList, SimulationRun, SimulationSeries } from '@gaiapus/contracts';
import { request } from './http';

const q = (params: Record<string, string | number | undefined>) =>
  Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');

export const simulations = {
  capabilities: (params: { location_id?: string; crop_id?: string; harvest_year?: number } = {}, signal?: AbortSignal) =>
    request<SimulationCatalog>(`/simulations/capabilities?${q(params)}`, { signal }),
  regional: (params: { location_id?: string; crop_id?: string; harvest_year?: number } = {}, signal?: AbortSignal) =>
    request<SimulationPublicationList>(`/simulations/regional?${q(params)}`, { signal }),
  run: (id: string, signal?: AbortSignal) => request<SimulationRun>(`/simulations/${encodeURIComponent(id)}`, { signal }),
  series: (id: string, signal?: AbortSignal) => request<SimulationSeries>(`/simulations/${encodeURIComponent(id)}/series`, { signal }),
};
