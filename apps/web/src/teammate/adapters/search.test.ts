import { afterEach, expect, it, vi } from 'vitest';
import { geography } from './index';
import { setLatency } from './core';
setLatency(0);
afterEach(() => vi.restoreAllMocks());
const fail = (status: number) => vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { code: 'dependency_failure', message: 'x' } }), { status }));

it('API fora: países, estados e municípios locais continuam aparecendo (D-01)', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
  const r = await geography.search('argentina');
  expect(r.remote).toBe('failed');
  expect(r.places.map((p) => p.name)).toContain('Argentina');
  expect((await geography.search('sorriso')).places[0]).toMatchObject({ type: 'municipio', code: '5107925' });
});

it('API com 503: idem', async () => {
  fail(503);
  const r = await geography.search('mato grosso');
  expect(r.remote).toBe('failed');
  expect(r.places.some((p) => p.type === 'uf' && p.code === '51')).toBe(true);
});

it('API respondendo: município do catálogo entra com a UF do próprio catálogo, sem duplicar', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ data: { items: [
    { area_id: '5218805', name: 'Rio Verde', kind: 'municipality', parent_id: 'BR-GO', country_id: 'BR', state_id: 'BR-GO', scope: 'x' },
    { area_id: '5107925', name: 'Sorriso', kind: 'municipality', parent_id: 'BR-MT', country_id: 'BR', state_id: 'BR-MT', scope: 'x' },
  ], next_cursor: null }, meta: {} })));
  const r = await geography.search('rio verde');
  expect(r.remote).toBe('ok');
  expect(r.places.find((p) => p.code === '5218805')).toMatchObject({ uf: '52', ufSigla: 'GO' });
  expect((await geography.search('sorriso')).places.filter((p) => p.code === '5107925')).toHaveLength(1);
});

it('cancelamento continua propagando', async () => {
  const c = new AbortController(); c.abort();
  await expect(geography.search('sorriso', c.signal)).rejects.toMatchObject({ name: 'AbortError' });
});

it('total informa quantos há além dos 12 exibidos', async () => {
  fail(503);
  const r = await geography.search('são');
  expect(r.total).toBeGreaterThan(12);
});
