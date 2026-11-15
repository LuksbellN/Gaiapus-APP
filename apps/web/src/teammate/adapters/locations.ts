// Location core v1 (Docs/2026-11-14-nucleo-global-lugares-design.md): the same data core for any place,
// Brazil or the US. Payloads are shown as published; texts are translated by the screens from codes.
import type { LocationCore, LocationPage, LocationSummary } from '@gaiapus/contracts';
import { request } from './http';
import type { Sourced } from './core';

export type { LocationCore, LocationSummary };
export type WeatherRow = { date: string; rain_mm: number; et0_mm: number; tmin_c: number | null; tmax_c: number | null };

const meta = (version?: string) => ({ kind: 'publicacao' as const, source: 'API /v1/locations', note: version ? `Publicação ${version}` : undefined });

export const locations = {
  async list(signal?: AbortSignal): Promise<LocationSummary[]> {
    return (await request<LocationPage>('/locations?limit=100', { signal })).items;
  },
  async core(id: string, signal?: AbortSignal): Promise<Sourced<LocationCore>> {
    const data = await request<LocationCore>(`/locations/${encodeURIComponent(id)}/core`, { signal });
    return { data, meta: meta() };
  },
};

/** Location id for a legacy area id; null for anything that is not a Brazilian municipality code. */
export function locationIdOf(areaId: string): string | null {
  return /^[0-9]{7}$/.test(areaId) ? `BR:ibge:${areaId}` : null;
}

/** Calendar-month totals of the published daily rows; months only contain the days that exist. */
export function monthlyWeather(rows: WeatherRow[]) {
  const months = new Map<string, { month: string; rain_mm: number; et0_mm: number; days: number }>();
  for (const r of rows) {
    const key = r.date.slice(0, 7);
    const m = months.get(key) ?? { month: key, rain_mm: 0, et0_mm: 0, days: 0 };
    m.rain_mm += r.rain_mm; m.et0_mm += r.et0_mm; m.days += 1;
    months.set(key, m);
  }
  return [...months.values()];
}
