// Coverage index built from the API catalogue (GET /v1/geography + /v1/coverage), not from a list written in code (D-09).
// It answers: which places have which products, for which period. Failure is explicit ("not consultable"),
// never "no data". A published field (demonstration rectangle) belongs to its municipality but its data are
// only about the rectangle.
import { useEffect, useState } from 'react';
import type { CoverageResult, Geography } from '@gaiapus/contracts';
import { backend } from '../adapters/http';

export type ProductId = CoverageResult['products'][number]['product_id'];
export type AreaProduct = { id: ProductId; availability: 'available' | 'partial' | 'no_data'; reasonCode: string | null; periods: { start: string; end: string }[]; crops: string[] };
export type AreaCoverage = { id: string; name: string; kind: Geography['kind']; parent: string | null; stateId: string | null; bbox?: [number, number, number, number]; geometryRef?: string; scope: string; products: AreaProduct[] };
export type CoverageIndex = { status: 'ok'; publication: string; areas: AreaCoverage[] } | { status: 'failed'; error: unknown };

/** A municipality with its own products and/or published fields that have products. */
export type PlaceWithData = { municipality: AreaCoverage; own: AreaProduct[]; fields: { field: AreaCoverage; products: AreaProduct[] }[] };

const has = (p: AreaProduct) => p.availability !== 'no_data';

export async function buildCoverageIndex(signal?: AbortSignal): Promise<CoverageIndex> {
  try {
    const geo = await backend.geographyList(signal);
    const targets = geo.items.filter((a) => a.kind === 'municipality' || a.kind === 'published_field');
    const results = await Promise.all(targets.map((a) => backend.coverage(a.area_id, signal).then((c) => [a.area_id, c] as const)));
    const byId = new Map(results);
    const areas: AreaCoverage[] = geo.items.map((a) => ({
      id: a.area_id, name: a.name, kind: a.kind, parent: a.parent_id, stateId: a.state_id, bbox: a.bbox, geometryRef: a.geometry_ref, scope: a.scope,
      products: (byId.get(a.area_id)?.products ?? []).map((p) => ({ id: p.product_id, availability: p.availability, reasonCode: p.reason_code, periods: p.periods, crops: p.supported_crops })),
    }));
    return { status: 'ok', publication: results[0]?.[1].publication_version ?? '', areas };
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    return { status: 'failed', error };
  }
}

let cached: Promise<CoverageIndex> | null = null;
/** Loaded once per session; a failed load is not cached so "Tentar de novo" really retries. */
export function loadCoverageIndex(): Promise<CoverageIndex> {
  if (!cached) cached = buildCoverageIndex().then((r) => { if (r.status === 'failed') cached = null; return r; });
  return cached;
}
export function resetCoverageIndexForTest() { cached = null; }

export function useCoverageIndex() {
  const [index, setIndex] = useState<CoverageIndex | null>(null); const [tick, setTick] = useState(0);
  useEffect(() => { let alive = true; loadCoverageIndex().then((r) => { if (alive) setIndex(r); }); return () => { alive = false; }; }, [tick]);
  return { index, retry: () => { setIndex(null); setTick((t) => t + 1); } };
}

export function placesWithData(index: CoverageIndex | null): PlaceWithData[] {
  if (!index || index.status !== 'ok') return [];
  const out: PlaceWithData[] = [];
  for (const m of index.areas.filter((a) => a.kind === 'municipality')) {
    const own = m.products.filter(has);
    const fields = index.areas.filter((a) => a.kind === 'published_field' && a.parent === m.id).map((field) => ({ field, products: field.products.filter(has) })).filter((f) => f.products.length);
    if (own.length || fields.length) out.push({ municipality: m, own, fields });
  }
  return out.sort((a, b) => b.own.length + b.fields.length - (a.own.length + a.fields.length) || a.municipality.name.localeCompare(b.municipality.name, 'pt-BR'));
}
/** IBGE municipality codes with data of their own or through a published field. */
export const coveredMunicipalities = (index: CoverageIndex | null) => placesWithData(index).map((p) => p.municipality.id);
/** State abbreviations (MT, MG…) that contain at least one place with data. */
export const statesWithData = (index: CoverageIndex | null) => [...new Set(placesWithData(index).map((p) => p.municipality.stateId?.replace(/^BR-/, '') ?? '').filter(Boolean))];
/** Published field with products inside a municipality, if any. */
export const fieldOf = (index: CoverageIndex | null, municipality: string) => placesWithData(index).find((p) => p.municipality.id === municipality)?.fields[0]?.field ?? null;
/** Center of an area's bounding box, for map markers. */
export const centerOf = (a: AreaCoverage): [number, number] | null => (a.bbox ? [(a.bbox[0] + a.bbox[2]) / 2, (a.bbox[1] + a.bbox[3]) / 2] : null);
