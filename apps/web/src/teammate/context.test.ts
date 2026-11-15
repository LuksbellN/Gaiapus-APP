import { describe, expect, it } from 'vitest';
import { plotElsewhere, resolvePlace, upcomingActivity } from './context';
import type { FieldRecord, Plot, Property } from './store';

const property: Property = { id: 'p', name: 'Sítio', municipalityCode: '3170206', municipalityName: 'Uberlândia', uf: 'MG', areaHa: null, createdAt: '', updatedAt: '' };
const plot: Plot = { id: 'a', propertyId: 'p', name: 'Talhão A', areaHa: 10, soil: '', irrigation: '', polygon: null, createdAt: '', updatedAt: '' };
const withPlot = { plot, property }; const none = { plot: null, property: null };
const q = (s: string) => new URLSearchParams(s);

describe('resolvePlace', () => {
  it('link vence talhão', () => { expect(resolvePlace(q('mun=5107925'), withPlot)).toMatchObject({ code: '5107925', origin: 'link' }); });
  it('talhão vence demonstração', () => { expect(resolvePlace(q(''), withPlot)).toEqual({ code: '3170206', name: 'Uberlândia, MG', origin: 'plot' }); });
  it('sem nada: demonstração de Sorriso', () => { expect(resolvePlace(q(''), none)).toEqual({ code: '5107925', name: 'Sorriso, MT', origin: 'demo' }); });
  it('simulação histórica ignora o talhão', () => { expect(resolvePlace(q(''), withPlot, { followPlot: false })).toMatchObject({ code: '5107925', origin: 'demo' }); });
  it('código malformado na URL é ignorado', () => { expect(resolvePlace(q('mun=abc'), none).origin).toBe('demo'); });
});

describe('plotElsewhere', () => {
  it('avisa quando o dado é de outro município', () => { expect(plotElsewhere({ code: '5107925', name: 'Sorriso, MT', origin: 'demo' }, withPlot)).toEqual({ plot: 'Talhão A', place: 'Uberlândia, MG' }); });
  it('silencia quando coincide ou não há talhão', () => { expect(plotElsewhere({ code: '3170206', name: '', origin: 'plot' }, withPlot)).toBeNull(); expect(plotElsewhere({ code: '5107925', name: '', origin: 'demo' }, none)).toBeNull(); });
});

describe('upcomingActivity (D-04)', () => {
  const r = (id: string, plotId: string, event_at: string) => ({ id, plotId, event_at, kind: 'evento', data: {} }) as unknown as FieldRecord;
  const recs = [r('1', 'a', '2027-01-10'), r('2', 'b', '2026-12-01'), r('3', 'b', '2026-01-01')];
  it('só do talhão em uso', () => { expect(upcomingActivity(recs, 'a', '2026-11-14')?.id).toBe('1'); });
  it('nada do talhão B aparece com o A ativo, e vice-versa', () => { expect(upcomingActivity(recs, 'b', '2026-11-14')?.id).toBe('2'); });
  it('sem talhão ativo, considera todos', () => { expect(upcomingActivity(recs, null, '2026-11-14')?.id).toBe('2'); });
});
