import { describe, expect, it } from 'vitest';
import { publicationMock } from './publication-mock.test-helper';
publicationMock();
import { latestOnly, setLatency, AdapterError } from './core';
import { crops } from './index';

describe('latestOnly', () => {
  it('descarta a resposta antiga quando um novo pedido começa', async () => {
    const run = latestOnly();
    const slow = run(() => new Promise<string>((r) => setTimeout(() => r('Sorriso'), 40)));
    const fast = run(() => new Promise<string>((r) => setTimeout(() => r('Uberlândia'), 5)));
    expect(await slow).toEqual({ stale: true });
    expect(await fast).toEqual({ stale: false, value: 'Uberlândia' });
  });
});
describe('contrato de erro de rendimento', () => {
  setLatency(0);
  it('cultura inválida → invalid_crop (400)', async () => { await expect(crops.yieldEstimate({ crop: 'banana', municipalityCode: '5107925' })).rejects.toMatchObject({ code: 'invalid_crop', status: 400 }); });
  it('código malformado → invalid_municipality_code (400)', async () => { await expect(crops.yieldEstimate({ crop: 'soy', municipalityCode: '123' })).rejects.toMatchObject({ code: 'invalid_municipality_code', status: 400 }); });
  it('município válido sem cobertura → municipality_not_covered (422)', async () => { await expect(crops.yieldEstimate({ crop: 'soy', municipalityCode: '3106200' })).rejects.toBeInstanceOf(AdapterError); await expect(crops.yieldEstimate({ crop: 'soy', municipalityCode: '3106200' })).rejects.toMatchObject({ code: 'municipality_not_covered', status: 422 }); });
  it('Sorriso soja reproduz o fixture Ridge nacional', async () => { const r = await crops.yieldEstimate({ crop: 'soy', municipalityCode: '5107925' }); expect(r.data.estimate_kg_ha).toBe(3554); expect(r.data.model.type).toBe('ridge'); });
  it('Uberlândia dia 20 fica antes do primeiro corte, sem estimativa', async () => { const r = await crops.yieldEstimate({ crop: 'soy', municipalityCode: '3170206' }); expect(r.data.status).toBe('before_first_cutoff'); expect(r.data.estimate_kg_ha).toBeNull(); });
});
