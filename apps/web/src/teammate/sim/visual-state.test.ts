import { describe, expect, it } from 'vitest';
import daily from '../data/sorriso-daily.json';
import { annualPose, decodeLand, phaseRunAt, poseFraction, REPRESENTATIVE, resolveFieldVisual, UNKNOWN_POSITION, type PhasePosition } from './visual-state';

const iso = (start: string, i: number) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10);
const series = (runs: [string, string, number][], start = '2027-01-01') => {
  const lands: string[] = [], stages: string[] = [], dates: string[] = [];
  for (const [land, stage, n] of runs) for (let i = 0; i < n; i++) { lands.push(land); stages.push(stage); dates.push(iso(start, dates.length)); }
  return { lands, stages, dates };
};

describe('decodeLand', () => {
  it('tells crop, intercrop, living cover and bare soil apart', () => {
    expect(decodeLand('soy')).toEqual({ kind: 'crop', family: 'soy', cover: null });
    expect(decodeLand('maize2')).toEqual({ kind: 'crop', family: 'maize', cover: null });
    expect(decodeLand('maize2+brachiaria')).toEqual({ kind: 'crop', family: 'maize', cover: 'brachiaria' });
    expect(decodeLand('brachiaria')).toEqual({ kind: 'cover', cover: 'brachiaria' });
    expect(decodeLand('bare')).toEqual({ kind: 'bare' });
  });
  it('maps both maize seasons to one archetype and both bean seasons to one profile', () => {
    expect(decodeLand('maize1')).toEqual(decodeLand('maize2'));
    expect(decodeLand('bean1')).toEqual(decodeLand('bean2'));
  });
  it('never turns an unknown value, a cohort or a bad input into soybean', () => {
    for (const land of ['sugarcane', 'cotton', 'coffee_total_mg', '', 'soy+maize2', null, undefined, 42]) expect(decodeLand(land).kind).toBe('unsupported');
  });
});

describe('phaseRunAt', () => {
  const s = series([['bare', 'off_season_bare', 5], ['soy', 'establishment', 10], ['soy', 'vegetative', 30], ['soy', 'reproductive', 40]]);
  it('gives a fraction only when both borders of the run are in the series', () => {
    expect(phaseRunAt(s.lands, s.stages, s.dates, 5)).toEqual({ source: 'full-phase', fraction: 0, day: 1, length: 10 });
    expect(phaseRunAt(s.lands, s.stages, s.dates, 14)).toEqual({ source: 'full-phase', fraction: 1, day: 10, length: 10 });
    expect(phaseRunAt(s.lands, s.stages, s.dates, 30).fraction).toBeCloseTo(15 / 29);
  });
  it('does not call the edge of the data the edge of a phase', () => {
    expect(phaseRunAt(s.lands, s.stages, s.dates, 2).source).toBe('window-only'); // touches the first element
    expect(phaseRunAt(s.lands, s.stages, s.dates, 60)).toEqual({ source: 'window-only', fraction: null, day: null, length: null }); // touches the last element
  });
  it('treats a date gap as an unproven border', () => {
    const gap = { ...s, dates: s.dates.map((d, i) => (i >= 15 ? iso(d, 3) : d)) };
    expect(phaseRunAt(gap.lands, gap.stages, gap.dates, 10).source).toBe('window-only');
    expect(phaseRunAt(gap.lands, gap.stages, gap.dates, 20).source).toBe('window-only');
  });
  it('is unknown for an index outside the series or a non-integer', () => {
    for (const i of [-1, 85, 1.5, NaN, Infinity]) expect(phaseRunAt(s.lands, s.stages, s.dates, i)).toEqual(UNKNOWN_POSITION);
  });
  it('a consortium is a different run from the crop alone', () => {
    const c = series([['soy', 'maturation', 5], ['maize2', 'vegetative', 5], ['maize2+brachiaria', 'vegetative', 5], ['brachiaria', 'off_season_cover', 5]]);
    expect(phaseRunAt(c.lands, c.stages, c.dates, 7).length).toBe(5);
    expect(phaseRunAt(c.lands, c.stages, c.dates, 12).length).toBe(5);
  });
});

describe('no accelerated growth from a short window', () => {
  it('six forecast days of one phase keep one fixed pose', () => {
    // The water projection: a handful of days, all "vegetative", with no day before or after.
    const w = series([['soy', 'vegetative', 6]]);
    const visuals = w.dates.map((_, i) => resolveFieldVisual(w.lands[i], w.stages[i], phaseRunAt(w.lands, w.stages, w.dates, i)));
    expect(new Set(visuals.map((v) => v.crop?.key)).size).toBe(1);
    expect(visuals[0].crop?.fraction).toBeCloseTo(REPRESENTATIVE.vegetative, 1);
    expect(visuals.every((v) => v.representative)).toBe(true);
    // The old rule (progress = position inside the window) would have gone from 0 to 1.
    expect(visuals[5].crop?.pose.height).toBe(visuals[0].crop?.pose.height);
  });
  it('a reproductive window without borders stays at flowering: no fruiting is inferred', () => {
    const w = series([['soy', 'reproductive', 6]]);
    const v = resolveFieldVisual('soy', 'reproductive', phaseRunAt(w.lands, w.stages, w.dates, 5));
    expect(v.crop?.pose.flower).toBe(1); expect(v.crop?.pose.fruit).toBe(0); expect(v.representative).toBe(true);
  });
  it('a phase change announced by the series still changes the pose', () => {
    const w = series([['soy', 'vegetative', 3], ['soy', 'reproductive', 3]]);
    const a = resolveFieldVisual('soy', w.stages[2], phaseRunAt(w.lands, w.stages, w.dates, 2)), b = resolveFieldVisual('soy', w.stages[3], phaseRunAt(w.lands, w.stages, w.dates, 3));
    expect(a.crop?.stage).toBe('vegetative'); expect(b.crop?.stage).toBe('reproductive'); expect(b.crop?.key).not.toBe(a.crop?.key);
  });
  it('invalid fractions fall back to the representative pose', () => {
    for (const fraction of [NaN, Infinity, null]) expect(poseFraction('vegetative', { source: 'full-phase', fraction, day: 1, length: 2 } as PhasePosition)).toBeCloseTo(REPRESENTATIVE.vegetative, 1);
    expect(poseFraction('vegetative', { source: 'full-phase', fraction: 7, day: 1, length: 2 })).toBe(1);
    expect(poseFraction('vegetative', { source: 'full-phase', fraction: -3, day: 1, length: 2 })).toBe(0);
  });
});

describe('resolveFieldVisual', () => {
  const full = (fraction: number): PhasePosition => ({ source: 'full-phase', fraction, day: 1, length: 40 });
  it('is deterministic: the same row gives the same pose key, also when scrubbing back', () => {
    const forward = [0.1, 0.5, 0.9].map((f) => resolveFieldVisual('soy', 'reproductive', full(f)).crop?.key);
    const back = [0.9, 0.5, 0.1].map((f) => resolveFieldVisual('soy', 'reproductive', full(f)).crop?.key).reverse();
    expect(back).toEqual(forward);
  });
  it('draws the living cover with the crop only when the row says so', () => {
    expect(resolveFieldVisual('maize2', 'vegetative', full(0.5)).cover).toBeNull();
    expect(resolveFieldVisual('maize2+brachiaria', 'vegetative', full(0.5)).cover?.pose).toBe('understory');
    expect(resolveFieldVisual('maize2+brachiaria', 'establishment', full(0.5)).cover?.pose).toBe('young');
    const cover = resolveFieldVisual('brachiaria', 'off_season_cover'); expect(cover.crop).toBeNull(); expect(cover.cover?.pose).toBe('living');
  });
  it('bare fallow draws no plant, no cover and no residue', () => {
    expect(resolveFieldVisual('bare', 'off_season_bare')).toMatchObject({ crop: null, cover: null, noPlantFor: null, unknownLand: null });
  });
  it('a catalogue crop outside the rotation gets no plant in the scene and says which crop', () => {
    for (const [land, family] of [['wheat', 'wheat'], ['rice', 'rice'], ['bean1', 'bean'], ['coffee_arabica', 'coffee_arabica']] as const) {
      const v = resolveFieldVisual(land, 'vegetative', full(0.5)); expect(v.crop).toBeNull(); expect(v.noPlantFor).toBe(family);
    }
  });
  it('unknown land or stage is reported, never drawn as soybean', () => {
    expect(resolveFieldVisual('cotton', 'vegetative', full(0.5))).toMatchObject({ crop: null, unknownLand: 'cotton' });
    expect(resolveFieldVisual('soy', 'ripening', full(0.5))).toMatchObject({ crop: null, unknownLand: 'soy:ripening' });
    expect(resolveFieldVisual('soy', 'off_season_bare', full(0.5)).crop).toBeNull();
  });
});

describe('annualPose', () => {
  it('is continuous across phase borders and never shrinks the stem', () => {
    expect(annualPose('establishment', 1).height).toBeCloseTo(annualPose('vegetative', 0).height);
    expect(annualPose('vegetative', 1).leaf).toBeCloseTo(annualPose('reproductive', 0).leaf);
    expect(annualPose('reproductive', 1)).toMatchObject({ fruit: 1, fill: 1, flower: 0 });
    expect(annualPose('maturation', 0)).toMatchObject({ fruit: 1, fill: 1, senescence: 0, drop: 0 });
    let last = 0;
    for (const stage of ['establishment', 'vegetative', 'reproductive', 'maturation'] as const) for (let i = 0; i <= 10; i++) { const h = annualPose(stage, i / 10).height; expect(h).toBeGreaterThanOrEqual(last); last = h; }
  });
  it('flowers come before fruits, fruits fill after they appear, and maturation dries organs gradually', () => {
    expect(annualPose('reproductive', 0.2)).toMatchObject({ flower: 1, fruit: 0 });
    expect(annualPose('reproductive', 0.6).fruit).toBeGreaterThan(0); expect(annualPose('reproductive', 0.6).fill).toBeLessThan(0.5);
    const mid = annualPose('maturation', 0.45); expect(mid.senescence).toBeGreaterThan(0.3); expect(mid.senescence).toBeLessThan(1); expect(mid.drop).toBeLessThan(0.5);
    expect(annualPose('maturation', 1)).toMatchObject({ senescence: 1, drop: 1, dry: 1, fruit: 1 });
  });
});

describe('the published Sorriso series', () => {
  it('has complete phase runs inside the record and only the labels this layer knows', () => {
    for (const scenario of [daily.scenarios.reference_fallow, daily.scenarios.brachiaria]) {
      const seen = new Set<string>();
      scenario.date.forEach((_, i) => {
        const v = resolveFieldVisual(scenario.land_cover[i], scenario.stage[i]); seen.add(`${scenario.land_cover[i]}|${scenario.stage[i]}`);
        expect(v.unknownLand).toBeNull(); expect(v.noPlantFor).toBeNull();
      });
      expect(seen.size).toBeGreaterThan(8);
      // 2020/2021 soybean vegetative phase: 35 days, both borders inside the series.
      const a = scenario.agricultural_year.indexOf('2020/2021');
      expect(phaseRunAt(scenario.land_cover, scenario.stage, scenario.date, a + 15)).toEqual({ source: 'full-phase', fraction: 0, day: 1, length: 35 });
      // The very first run of the record has no day before it: its start is not proven.
      expect(phaseRunAt(scenario.land_cover, scenario.stage, scenario.date, 3).source).toBe('window-only');
    }
  });
});
