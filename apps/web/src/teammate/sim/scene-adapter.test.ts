import { describe, expect, it } from 'vitest';
import daily from '../data/sorriso-daily.json';
import projection from '../data/fixtures/water-soy-5107925-N10.json';
import { LEGACY_SCENE_CAPS, rowsFromDailyScenario, rowsFromProjection, stressLevel, toSceneState, type SceneDailyRow } from './scene-adapter';

const base: SceneDailyRow = {
  date: '2020-12-01', land_cover: 'soy', phase_code: 'vegetative', precipitation_mm: 12, irrigation_net_mm: null, et0_mm: 4.5, etc_mm: 4, eta_mm: 3.5,
  storage_mm: 30, capacity_mm: 55, available_water_fraction: 30 / 55, runoff_mm: null, drainage_mm: 0, stress_coefficient: 0.8, root_depth_m: null,
};

describe('toSceneState', () => {
  it('keeps unknown fields unknown instead of turning them into zero', () => {
    const s = toSceneState({ ...base, precipitation_mm: null, drainage_mm: null, storage_mm: null, available_water_fraction: null, stress_coefficient: null }, LEGACY_SCENE_CAPS);
    expect(s.rainMm).toBeNull();
    expect(s.drainageMm).toBeNull();
    expect(s.runoffMm).toBeNull();
    expect(s.irrigationMm).toBeNull();
    expect(s.waterFraction).toBeNull();
    expect(s.stress).toBeNull();
    expect(s.rainParticles).toBe(0);
  });
  it('shows roots and a depth scale only when the method provides a root depth', () => {
    expect(toSceneState(base, LEGACY_SCENE_CAPS)).toMatchObject({ rootDepthM: null, depthScale: false });
    // A depth in the row is ignored when the capability says the method does not sustain it.
    expect(toSceneState({ ...base, root_depth_m: 0.6 }, LEGACY_SCENE_CAPS)).toMatchObject({ rootDepthM: null, depthScale: false });
    expect(toSceneState({ ...base, root_depth_m: 0.6 }, { ...LEGACY_SCENE_CAPS, rootDepth: true })).toMatchObject({ rootDepthM: 0.6, depthScale: true });
  });
  it('never draws virtual probes from a single-bucket mean', () => {
    expect(toSceneState(base, LEGACY_SCENE_CAPS).virtualProbes).toBe(false);
    expect(toSceneState({ ...base, root_depth_m: 0.6 }, { ...LEGACY_SCENE_CAPS, rootDepth: true }).virtualProbes).toBe(false);
    expect(toSceneState({ ...base, root_depth_m: 0.6 }, { ...LEGACY_SCENE_CAPS, rootDepth: true, layeredSoil: true }).virtualProbes).toBe(true);
  });
  it('uses the published water fraction, falling back to storage/capacity', () => {
    expect(toSceneState(base, LEGACY_SCENE_CAPS).waterFraction).toBeCloseTo(30 / 55, 12);
    expect(toSceneState({ ...base, available_water_fraction: null }, LEGACY_SCENE_CAPS).waterFraction).toBeCloseTo(30 / 55, 12);
  });
  it('derives particles only from the day flux, with a ceiling, deterministically', () => {
    expect(toSceneState({ ...base, precipitation_mm: 0 }, LEGACY_SCENE_CAPS).rainParticles).toBe(0);
    const a = toSceneState({ ...base, precipitation_mm: 12 }, LEGACY_SCENE_CAPS).rainParticles;
    expect(a).toBeGreaterThan(0);
    expect(toSceneState({ ...base, precipitation_mm: 12 }, LEGACY_SCENE_CAPS).rainParticles).toBe(a);
    expect(toSceneState({ ...base, precipitation_mm: 900 }, LEGACY_SCENE_CAPS).rainParticles).toBeLessThanOrEqual(300);
  });
  it('matches the panel stress rule: any ks below 1 is stress', () => {
    expect(stressLevel(1)).toBe('none');
    expect(stressLevel(0.99)).toBe('moderate');
    expect(stressLevel(0.49)).toBe('severe');
    expect(stressLevel(null)).toBeNull();
  });
});

describe('legacy data → canonical rows (no recalculation)', () => {
  const scen = daily.scenarios.reference_fallow;
  const rows = rowsFromDailyScenario(scen, daily.capacity_mm);
  it('copies every published number of every day unchanged', () => {
    expect(rows).toHaveLength(scen.date.length);
    rows.forEach((r, i) => {
      expect(r.date).toBe(scen.date[i]);
      expect(r.precipitation_mm).toBe(scen.rain_mm[i]);
      expect(r.storage_mm).toBe(scen.storage_end_mm[i]);
      expect(r.available_water_fraction).toBe(scen.available_water_fraction[i]);
      expect(r.stress_coefficient).toBe(scen.ks[i]);
      expect(r.drainage_mm).toBe(scen.drainage_mm[i]);
      expect(r.et0_mm).toBe(scen.et0_mm[i]);
      expect(r.etc_mm).toBe(scen.etc_mm[i]);
      expect(r.eta_mm).toBe(scen.eta_mm[i]);
      expect(r.capacity_mm).toBe(55);
    });
  });
  it('marks fields absent from the package as unknown', () => {
    expect(rows.every((r) => r.runoff_mm === null && r.irrigation_net_mm === null && r.root_depth_m === null)).toBe(true);
  });
  it('scene state of a day carries the same values the chart and panel show', () => {
    const i = 400; const s = toSceneState(rows[i], LEGACY_SCENE_CAPS);
    expect(s.date).toBe(scen.date[i]);
    expect(s.phase).toBe(scen.stage[i]);
    expect(s.land).toBe(scen.land_cover[i]);
    expect(s.rainMm).toBe(scen.rain_mm[i]);
    expect(s.waterFraction).toBe(scen.available_water_fraction[i]);
    expect(s.drainageMm).toBe(scen.drainage_mm[i]);
  });
  it('projection rows keep ETc, ETa and drainage unknown (not provided by the product)', () => {
    const pr = rowsFromProjection(projection.days, projection.soil.capacity_mm);
    expect(pr).toHaveLength(projection.days.length);
    expect(pr[0]).toMatchObject({ etc_mm: null, eta_mm: null, drainage_mm: null, runoff_mm: null, land_cover: 'soy', phase_code: projection.days[0].phase, precipitation_mm: projection.days[0].rain_mm });
  });
});
