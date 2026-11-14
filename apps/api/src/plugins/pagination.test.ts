import { it, expect, vi } from 'vitest';
import { createApp } from '../app.js';
import { supabaseDependencies } from './supabase.js';
import { testDependencies, authA } from '../../tests/helpers.js';
it('pages all 1001 summaries beyond the provider row cap without fetching scientific envelopes', async () => {
  const rows = Array.from({ length: 1001 }, (_, index) => ({ id: `00000000-0000-4000-8000-${String(1001 - index).padStart(12, '0')}`, title: 'Saved', product_id: 'yield_estimate', area_id: '5107925', created_at: '2026-11-14T12:00:00Z', updated_at: '2026-11-14T12:00:00Z', result_basis: 'retrospective_estimate', monitored_place_id: null }));
  const selected: string[] = [];
  vi.stubGlobal('fetch', async (url: string, _options: RequestInit) => {
    const parsed = new URL(String(url)); let data: unknown = null;
    if (parsed.pathname.endsWith('/comparison_snapshots')) {
      selected.push(parsed.searchParams.get('select')!);
      const after = parsed.searchParams.get('or')?.match(/id\.lt\.([a-f0-9-]{36})/)?.[1];
      const limit = Math.min(1000, Number(parsed.searchParams.get('limit') ?? 1000));
      data = rows.filter(row => !after || row.id < after).slice(0, limit);
    }
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const db = supabaseDependencies({ url: 'https://db.example.test', publishableKey: 'publishable-test' });
  const app = createApp({ ...testDependencies(), repositoryFor: db.repositoryFor });
  try {
    const ids = new Set<string>(); let cursor: string | null = null;
    do {
      const response = await app.inject({ url: `/v1/comparisons?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, headers: authA });
      expect(response.statusCode).toBe(200);
      for (const row of response.json().data.items) ids.add(row.id);
      cursor = response.json().data.next_cursor;
    } while (cursor && ids.size < 1100);
    expect(ids.size).toBe(1001);
    expect(selected.every(selection => !selection.includes('output_envelope') && !selection.includes('input_snapshot'))).toBe(true);
  } finally { vi.unstubAllGlobals(); await app.close(); }
});
