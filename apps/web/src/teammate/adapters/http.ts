import { api, ApiError } from '../../lib/api/client';
import type { CoverageResult, ExampleDetail, GeographyPage, MeResult } from '@gaiapus/contracts';
import { AdapterError, type Sourced } from './core';
import { translate } from '../i18n';

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return (await api.request<T>(path, options))!.data;
  } catch (error) {
    if (error instanceof ApiError) throw new AdapterError(error.code, error.status, error.message);
    if ((error as Error).name === 'AbortError') throw error;
    // Browser offline → network; online but the request failed → the Gaiapus service is unreachable.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AdapterError('network', 0, 'Sem conexão.');
    throw new AdapterError('api_unreachable', 0, 'Não foi possível falar com o servidor da Gaiapus.');
  }
}

export async function publishedExample<T>(id: string, signal?: AbortSignal): Promise<Sourced<T>> {
  const example = await request<ExampleDetail>(`/examples/${encodeURIComponent(id)}`, { signal });
  return { data: example.result.data as T, meta: {
    kind: 'publicacao', source: example.source_refs.map(source => source.description).join(' · '),
    generatedAt: example.result.data.generated_at,
    note: `${translate('source.version', { version: example.result.meta.publication_version })} · ${example.result.meta.result_basis}`,
  } };
}

export const backend = {
  coverage: (area: string, signal?: AbortSignal) => request<CoverageResult>(`/coverage?area_id=${encodeURIComponent(area)}`, { signal }),
  geography: (q: string, signal?: AbortSignal) => request<GeographyPage>(`/geography?q=${encodeURIComponent(q)}&limit=100`, { signal }),
  geographyList: (signal?: AbortSignal) => request<GeographyPage>('/geography?limit=100', { signal }),
  me: () => request<MeResult>('/me'),
  updateName: (name: string) => request<MeResult>('/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ display_name: name }) }),
};
