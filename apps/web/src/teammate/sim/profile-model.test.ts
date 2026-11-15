import { describe, expect, it } from 'vitest';
import { LEGACY_SCENE_CAPS, toSceneState, type SceneDailyRow } from './scene-adapter';
import { profileLayers, SOIL_UNKNOWN } from './profile-model';

const row: SceneDailyRow = {
  date: '2020-12-01', land_cover: 'soy', phase_code: 'reproductive', precipitation_mm: 18, irrigation_net_mm: null, et0_mm: 5, etc_mm: 5, eta_mm: 4,
  storage_mm: 20, capacity_mm: 55, available_water_fraction: 20 / 55, runoff_mm: null, drainage_mm: 3, stress_coefficient: 0.7, root_depth_m: null,
};

describe('profileLayers (shared by the 3D profile and its 2D fallback)', () => {
  it('legacy bucket: one root-zone mean, no roots, no ruler, no probes', () => {
    const p = profileLayers(toSceneState(row, LEGACY_SCENE_CAPS), 0.5);
    expect(p.zone).toBe('root_zone_mean');
    expect(p.roots).toBeNull();
    expect(p.rulerTicksM).toEqual([]);
    expect(p.probesM).toEqual([]);
  });
  it('drainage arrow appears only on days with drainage, and grows with it', () => {
    const a = profileLayers(toSceneState(row, LEGACY_SCENE_CAPS), 0.5).drainage;
    const b = profileLayers(toSceneState({ ...row, drainage_mm: 30 }, LEGACY_SCENE_CAPS), 0.5).drainage;
    expect(a).not.toBeNull();
    expect(b!.length).toBeGreaterThan(a!.length);
    expect(profileLayers(toSceneState({ ...row, drainage_mm: 0 }, LEGACY_SCENE_CAPS), 0.5).drainage).toBeNull();
    expect(profileLayers(toSceneState({ ...row, drainage_mm: null }, LEGACY_SCENE_CAPS), 0.5).drainage).toBeNull();
  });
  it('runoff is not drawn when the method does not provide it', () => {
    expect(profileLayers(toSceneState({ ...row, runoff_mm: 9 }, LEGACY_SCENE_CAPS), 0.5).runoff).toBeNull();
    expect(profileLayers(toSceneState({ ...row, runoff_mm: 9 }, { ...LEGACY_SCENE_CAPS, runoff: true }), 0.5).runoff).not.toBeNull();
  });
  it('unknown water is drawn with the neutral unknown colour, not as dry soil', () => {
    const p = profileLayers(toSceneState({ ...row, available_water_fraction: null, storage_mm: null }, LEGACY_SCENE_CAPS), 0.5);
    expect(p.soilColor).toBe(SOIL_UNKNOWN);
    expect(p.waterKnown).toBe(false);
  });
  it('wetter soil is darker', () => {
    const lum = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    const dry = profileLayers(toSceneState({ ...row, available_water_fraction: 0.1 }, LEGACY_SCENE_CAPS), 0.5).soilColor;
    const wet = profileLayers(toSceneState({ ...row, available_water_fraction: 0.9 }, LEGACY_SCENE_CAPS), 0.5).soilColor;
    expect(lum(wet)).toBeLessThan(lum(dry));
  });
  it('with a sustained root depth: roots, ruler and the root-zone boundary at that depth', () => {
    const p = profileLayers(toSceneState({ ...row, root_depth_m: 0.6 }, { ...LEGACY_SCENE_CAPS, rootDepth: true }), 0.5);
    expect(p.zone).toBe('root_zone_depth');
    expect(p.roots).toEqual({ depthM: 0.6 });
    expect(p.rulerTicksM.length).toBeGreaterThan(0);
    expect(p.rulerTicksM).toContain(0.6);
  });
  it('device (stake) is optional and drawn at its real electrode depths with a depth ruler', () => {
    const off = profileLayers(toSceneState(row, LEGACY_SCENE_CAPS), 0.5);
    expect(off.device).toBeNull();
    expect(off.rulerTicksM).toEqual([]);
    const on = profileLayers(toSceneState(row, LEGACY_SCENE_CAPS), 0.5, { device: true });
    expect(on.device).not.toBeNull();
    expect(on.device!.electrodesM).toEqual([0.15, 0.4]);
    expect(on.rulerTicksM).toEqual([0, 0.15, 0.4, 1, 1.5]);
    // A single bucket has no value per depth: the electrodes carry no reading, and no virtual probes appear.
    expect(on.device!.readings).toBe('unavailable');
    expect(on.probesM).toEqual([]);
    expect(on.zone).toBe('root_zone_mean');
  });
  it('device LED follows the protocol codes from the model stress, labelled as model', () => {
    const led = (ks: number | null) => profileLayers(toSceneState({ ...row, stress_coefficient: ks }, LEGACY_SCENE_CAPS), 0.5, { device: true }).device!;
    expect(led(1).led).toBe(1);
    expect(led(0.8).led).toBe(2);
    expect(led(0.2).led).toBe(3);
    expect(led(null).led).toBe(0);
    expect(led(1).ledSource).toBe('model');
  });
  it('with a layered profile the electrodes may show model values per depth', () => {
    const caps = { ...LEGACY_SCENE_CAPS, rootDepth: true, layeredSoil: true };
    expect(profileLayers(toSceneState({ ...row, root_depth_m: 0.6 }, caps), 0.5, { device: true }).device!.readings).toBe('model_layers');
  });
  it('leaf colour follows stress; plants follow the illustrative development only', () => {
    const none = profileLayers(toSceneState({ ...row, stress_coefficient: 1 }, LEGACY_SCENE_CAPS), 0.5);
    const severe = profileLayers(toSceneState({ ...row, stress_coefficient: 0.2 }, LEGACY_SCENE_CAPS), 0.5);
    expect(none.leafColor).not.toBe(severe.leafColor);
    expect(profileLayers(toSceneState({ ...row, land_cover: 'bare', phase_code: 'off_season_bare' }, LEGACY_SCENE_CAPS), 0.5).plantHeight).toBe(0);
  });
});

describe('profileLayers — root system', () => {
  it('is off unless requested, illustrative on published bucket data, calculated only when the method provides depth', () => {
    expect(profileLayers(toSceneState(row, LEGACY_SCENE_CAPS), 0.5).rootSystem).toBeNull();
    const ill = profileLayers(toSceneState(row, LEGACY_SCENE_CAPS), 0.5, { roots: true }).rootSystem!;
    expect(ill.source).toBe('illustrative');
    expect(ill.depthLabelM).toBeNull();
    const calc = profileLayers(toSceneState({ ...row, root_depth_m: 0.6, root_depth_source: 'modelled' }, { ...LEGACY_SCENE_CAPS, rootDepth: true }), 0.5, { roots: true }).rootSystem!;
    expect([calc.source, calc.depthLabelM]).toEqual(['modelled', 0.6]);
    // A depth present in the row but not sustained by the method stays ignored: still illustrative.
    expect(profileLayers(toSceneState({ ...row, root_depth_m: 0.6, root_depth_source: 'modelled' }, LEGACY_SCENE_CAPS), 0.5, { roots: true }).rootSystem!.source).toBe('illustrative');
  });
  it('bare fallow has no root system', () => {
    expect(profileLayers(toSceneState({ ...row, land_cover: 'bare', phase_code: 'off_season_bare' }, LEGACY_SCENE_CAPS), 0.5, { roots: true }).rootSystem).toBeNull();
  });
});

describe('profileLayers — module graph as loaded by the app (profile-model first)', () => {
  it('a calculated depth beyond the profile is drawn to a finite edge and flagged', () => {
    const r = profileLayers(toSceneState({ ...row, root_depth_m: 2.4, root_depth_source: 'modelled' }, { ...LEGACY_SCENE_CAPS, rootDepth: true }), 0.5, { roots: true }).rootSystem!;
    expect(Number.isFinite(r.drawDepthM)).toBe(true);
    expect(r.drawDepthM).toBeLessThanOrEqual(1.5);
    expect(r.continuesBelow).toBe(true);
  });
});
