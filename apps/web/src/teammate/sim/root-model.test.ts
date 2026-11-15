import { describe, expect, it } from 'vitest';
import { MAX_SEGMENTS_PER_PLANT, rootLayer, type RootInput } from './root-model';
import { PROFILE_DEPTH_M } from './profile-model';

const soy = (phase: string, progress: number, extra: Partial<RootInput> = {}): RootInput => ({ land: 'soy', phase, progress, rootDepthM: null, rootDepthSource: null, ...extra });
const order = ['establishment', 'vegetative', 'reproductive', 'maturation'];
const days = order.flatMap((p) => [0, 0.25, 0.5, 0.75, 1].map((x) => [p, x] as const));

describe('rootLayer — source and contract', () => {
  it('without a calculated depth the roots are illustrative and carry no centimetres', () => {
    const r = rootLayer(soy('vegetative', 0.5))!;
    expect(r.source).toBe('illustrative');
    expect(r.depthLabelM).toBeNull();
    expect(r.growth).toBeGreaterThan(0);
  });
  it('a calculated depth is used as is, with its source and unit', () => {
    const r = rootLayer(soy('vegetative', 0.5, { rootDepthM: 0.62, rootDepthSource: 'modelled' }))!;
    expect(r).toMatchObject({ source: 'modelled', depthLabelM: 0.62, drawDepthM: 0.62, continuesBelow: false });
    expect(rootLayer(soy('vegetative', 0.5, { rootDepthM: 0.3, rootDepthSource: 'observed' }))!.source).toBe('observed');
  });
  it('a depth beyond the drawn profile is drawn to the edge and flagged; the value is never changed', () => {
    const r = rootLayer(soy('reproductive', 1, { rootDepthM: 2.4, rootDepthSource: 'modelled' }))!;
    expect(r.depthLabelM).toBe(2.4);
    expect(r.drawDepthM).toBeLessThanOrEqual(PROFILE_DEPTH_M);
    expect(r.continuesBelow).toBe(true);
  });
  it('invalid calculated values fall back to illustrative and say why', () => {
    for (const bad of [Number.NaN, -0.2, 0, 25, Number.POSITIVE_INFINITY]) {
      const r = rootLayer(soy('vegetative', 0.5, { rootDepthM: bad, rootDepthSource: 'modelled' }))!;
      expect(r.source, String(bad)).toBe('illustrative');
      expect(r.invalidCalculated).toBe(true);
      expect(r.depthLabelM).toBeNull();
    }
  });
});

describe('rootLayer — growth over the timeline', () => {
  it('is deterministic: the same day always gives the same geometry', () => {
    expect(rootLayer(soy('reproductive', 0.4))).toEqual(rootLayer(soy('reproductive', 0.4)));
  });
  it('grows monotonically through the cycle and never shrinks at maturity', () => {
    const growth = days.map(([p, x]) => rootLayer(soy(p, x))!.growth);
    growth.slice(1).forEach((g, i) => expect(g).toBeGreaterThanOrEqual(growth[i]));
    expect(rootLayer(soy('maturation', 1))!.growth).toBe(rootLayer(soy('reproductive', 1))!.growth);
  });
  it('earlier days draw a prefix of later days (going back reproduces the same smaller root)', () => {
    const early = rootLayer(soy('vegetative', 0.2))!.segments, late = rootLayer(soy('reproductive', 0.8))!.segments;
    expect(early.length).toBeLessThan(late.length);
    early.forEach((s, i) => { expect(late[i].from).toEqual(s.from); expect(late[i].plant).toBe(s.plant); });
  });
  it('every plant grows at the same time (no plant waits for another)', () => {
    for (const land of ['soy', 'maize2', 'coffee_arabica']) {
      const r = rootLayer({ land, phase: 'vegetative', progress: 0.2, rootDepthM: null, rootDepthSource: null, ageYears: 1 })!;
      expect(new Set(r.segments.map((s) => s.plant)).size, land).toBe(r.plants);
    }
  });
  it('fallow and bare soil have no roots; a new crop starts from its own establishment', () => {
    expect(rootLayer({ land: 'bare', phase: 'off_season_bare', progress: 0.5, rootDepthM: null, rootDepthSource: null })).toBeNull();
    const maizeStart = rootLayer({ land: 'maize2', phase: 'establishment', progress: 0, rootDepthM: null, rootDepthSource: null })!;
    expect(maizeStart.growth).toBeLessThan(rootLayer(soy('maturation', 1))!.growth);
  });
});

describe('rootLayer — architectures and cost', () => {
  it('soy: one taproot per plant with lateral branches', () => {
    const r = rootLayer(soy('reproductive', 1))!;
    expect(r.architecture).toBe('taproot');
    const p0 = r.segments.filter((s) => s.plant === 0);
    expect(p0.filter((s) => s.order === 0).length).toBeGreaterThan(0);
    expect(new Set(p0.filter((s) => s.order === 0).map((s) => s.root)).size).toBe(1);
    expect(p0.some((s) => s.order === 1)).toBe(true);
  });
  it('maize: fibrous system with many primary roots and none dominant', () => {
    const r = rootLayer({ land: 'maize2+brachiaria', phase: 'reproductive', progress: 1, rootDepthM: null, rootDepthSource: null })!;
    expect(r.architecture).toBe('fibrous');
    expect(new Set(r.segments.filter((s) => s.plant === 0 && s.order === 0).map((s) => s.root)).size).toBeGreaterThanOrEqual(8);
  });
  it('coffee is perennial: an adult keeps a full root system; a young plant follows its age; unknown age is flagged', () => {
    const adult = rootLayer({ land: 'coffee_arabica', phase: 'vegetative', progress: 0.1, rootDepthM: null, rootDepthSource: null, ageYears: 8 })!;
    const young = rootLayer({ land: 'coffee_arabica', phase: 'vegetative', progress: 0.1, rootDepthM: null, rootDepthSource: null, ageYears: 1 })!;
    const unknown = rootLayer({ land: 'coffee_arabica', phase: 'vegetative', progress: 0.1, rootDepthM: null, rootDepthSource: null })!;
    expect(adult.architecture).toBe('perennial');
    expect(adult.growth).toBe(1);
    expect(young.growth).toBeLessThan(adult.growth);
    expect(unknown.ageUnknown).toBe(true);
  });
  it('stays within a fixed segment budget (no thousands of objects per plant)', () => {
    for (const land of ['soy', 'maize2', 'coffee_arabica', 'brachiaria']) {
      const r = rootLayer({ land, phase: 'reproductive', progress: 1, rootDepthM: null, rootDepthSource: null, ageYears: 10 })!;
      const perPlant = Math.max(...[...new Set(r.segments.map((s) => s.plant))].map((p) => r.segments.filter((s) => s.plant === p).length));
      expect(perPlant, land).toBeLessThanOrEqual(MAX_SEGMENTS_PER_PLANT);
      expect(r.segments.length, land).toBeLessThanOrEqual(MAX_SEGMENTS_PER_PLANT * r.plants);
    }
  });
});
