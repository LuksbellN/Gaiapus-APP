// Canonical daily result → visual scene state. No three.js import: this module ships with the simulator page,
// the 2D fallback and the legends. It never recalculates anything and never fabricates a measurement:
// a field the method does not provide stays null and the scene hides it.
//
// The scene vocabulary (soil cross-section, roots, rain/irrigation particles, drainage/runoff arrows, stress colours)
// is inspired by the Lara simulator (github.com/LaraLLC/Hackathon-Nasa-SpaceApps @ 76aaf46, features/twin/twinModel.ts).
// That repository declares no licence, so nothing is copied; the mapping below is reimplemented for Gaiapus rules.

/** Subset of the proposed DailySimulationRow (ARQUITETURA §4). `null` = not provided by the method, never zero. */
export type SceneDailyRow = {
  date: string;
  land_cover: string;
  phase_code: string;
  precipitation_mm: number | null;
  irrigation_net_mm: number | null;
  et0_mm: number | null;
  etc_mm: number | null;
  eta_mm: number | null;
  storage_mm: number | null;
  capacity_mm: number | null;
  available_water_fraction: number | null;
  runoff_mm: number | null;
  drainage_mm: number | null;
  stress_coefficient: number | null;
  root_depth_m: number | null;
  /** Origin of root_depth_m when present: computed by the engine or observed. Absent/null for methods without roots. */
  root_depth_source?: 'modelled' | 'observed' | null;
};

/** What the method behind a result sustains. The scene shows a quantity only when its capability is true. */
export type SceneCapabilities = { rootDepth: boolean; layeredSoil: boolean; irrigation: boolean; runoff: boolean };

/** The published v7 fixtures: one fixed root-zone bucket (AD4), rainfed, no runoff, no root depth, no layers. */
export const LEGACY_SCENE_CAPS: SceneCapabilities = { rootDepth: false, layeredSoil: false, irrigation: false, runoff: false };

export type StressLevel = 'none' | 'moderate' | 'severe';

export type CropSceneState = {
  date: string;
  land: string;
  phase: string;
  /** Root-zone mean water, 0–1 of available capacity. Not a vertical profile. */
  waterFraction: number | null;
  rainMm: number | null;
  irrigationMm: number | null;
  drainageMm: number | null;
  runoffMm: number | null;
  rootDepthM: number | null;
  rootDepthSource: 'modelled' | 'observed' | null;
  stress: StressLevel | null;
  /** A depth ruler only makes sense when a depth is interpretable. */
  depthScale: boolean;
  /** Virtual 15/40 cm probes need a layered profile; a bucket mean cannot feed them. */
  virtualProbes: boolean;
  rainParticles: number;
  irrigationParticles: number;
};

const known = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const orNull = (v: number | null | undefined) => (known(v) ? v : null);

/** Same rule as the results panel: any ks below 1 is water stress. The 0.5 split is only a colour step. */
export function stressLevel(ks: number | null | undefined): StressLevel | null {
  if (!known(ks)) return null;
  if (ks >= 1) return 'none';
  return ks >= 0.5 ? 'moderate' : 'severe';
}

/** Particle counts are decoration proportional to the day's flux; they never feed back into any number. */
const particles = (mm: number | null, perMm: number, cap: number) => (mm != null && mm > 0.2 ? Math.min(cap, Math.round(20 + mm * perMm)) : 0);

export function toSceneState(row: SceneDailyRow, caps: SceneCapabilities): CropSceneState {
  const storage = orNull(row.storage_mm), capacity = orNull(row.capacity_mm);
  const fraction = known(row.available_water_fraction) ? row.available_water_fraction : storage != null && capacity != null && capacity > 0 ? storage / capacity : null;
  const rootDepthM = caps.rootDepth && known(row.root_depth_m) && row.root_depth_m > 0 ? row.root_depth_m : null;
  const rainMm = orNull(row.precipitation_mm);
  const irrigationMm = caps.irrigation ? orNull(row.irrigation_net_mm) : null;
  return {
    date: row.date,
    land: row.land_cover,
    phase: row.phase_code,
    waterFraction: fraction == null ? null : Math.min(1, Math.max(0, fraction)),
    rainMm,
    irrigationMm,
    drainageMm: orNull(row.drainage_mm),
    runoffMm: caps.runoff ? orNull(row.runoff_mm) : null,
    rootDepthM,
    rootDepthSource: rootDepthM != null ? (row.root_depth_source ?? 'modelled') : null,
    // On bare fallow the coefficient only reduces soil evaporation: there is no plant to be stressed.
    stress: row.land_cover === 'bare' ? null : stressLevel(row.stress_coefficient),
    depthScale: rootDepthM != null,
    virtualProbes: caps.layeredSoil && rootDepthM != null,
    rainParticles: particles(rainMm, 8, 300),
    irrigationParticles: particles(irrigationMm, 6, 160),
  };
}

type LegacyScenario = {
  date: string[]; land_cover: string[]; stage: string[]; rain_mm: number[]; et0_mm: number[]; etc_mm: (number | null)[]; eta_mm: (number | null)[];
  drainage_mm: (number | null)[]; storage_end_mm: number[]; available_water_fraction: number[]; ks: number[];
};

/** Published daily scenario (v7 package) → canonical rows, value for value. */
export function rowsFromDailyScenario(s: LegacyScenario, capacityMm: number): SceneDailyRow[] {
  return s.date.map((date, i) => ({
    date, land_cover: s.land_cover[i], phase_code: s.stage[i], precipitation_mm: s.rain_mm[i], irrigation_net_mm: null,
    et0_mm: s.et0_mm[i], etc_mm: s.etc_mm[i] ?? null, eta_mm: s.eta_mm[i] ?? null, storage_mm: s.storage_end_mm[i], capacity_mm: capacityMm,
    available_water_fraction: s.available_water_fraction[i], runoff_mm: null, drainage_mm: s.drainage_mm[i] ?? null, stress_coefficient: s.ks[i], root_depth_m: null,
  }));
}

type ProjectionDay = { date: string; phase: string; rain_mm: number; et0_mm: number; storage_end_mm: number; available_water_fraction: number; ks: number };

/** Published water-risk projection → canonical rows. The product does not provide ETc, ETa or drainage. */
export function rowsFromProjection(days: ProjectionDay[], capacityMm: number): SceneDailyRow[] {
  return days.map((d) => ({
    date: d.date, land_cover: 'soy', phase_code: d.phase, precipitation_mm: d.rain_mm, irrigation_net_mm: null, et0_mm: d.et0_mm, etc_mm: null, eta_mm: null,
    storage_mm: d.storage_end_mm, capacity_mm: capacityMm, available_water_fraction: d.available_water_fraction, runoff_mm: null, drainage_mm: null,
    stress_coefficient: d.ks, root_depth_m: null,
  }));
}
