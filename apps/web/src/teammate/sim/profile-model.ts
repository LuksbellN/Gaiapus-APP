// What the soil-profile view draws for one day, as plain data. The 3D profile and its 2D fallback both read this,
// so they cannot disagree. No three.js import.
import { development } from './field-state';
import type { CropSceneState, StressLevel } from './scene-adapter';

export const SOIL_DRY = '#c9a97a';
export const SOIL_WET = '#4a3323';
/** Water not provided by the method: neutral grey, never the dry colour. */
export const SOIL_UNKNOWN = '#8d877d';
/** Soil below the root zone exists but its water is not simulated by a single bucket. */
export const SOIL_BELOW = '#9a8f80';
export const LEAF: Record<StressLevel | 'unknown', string> = { none: '#3f8f3a', moderate: '#c9a40f', severe: '#8a5a2b', unknown: '#6f8f6a' };
export const RAIN_COLOR = '#2f80d1';
export const IRRIGATION_COLOR = '#7a68ee';
export const DRAINAGE_COLOR = '#3d8bd6';
export const RUNOFF_COLOR = '#c27a2c';

/** Profile block depth in metres (true scale, no vertical exaggeration). */
export const PROFILE_DEPTH_M = 1.5;

export function lerpHex(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

export type Arrow = { length: number; width: number };
export type ProfileLayers = {
  /** `root_zone_mean`: one bucket, depth unknown. `root_zone_depth`: zone bounded at a sustained root depth. */
  zone: 'root_zone_mean' | 'root_zone_depth';
  soilColor: string;
  waterKnown: boolean;
  roots: { depthM: number } | null;
  rulerTicksM: number[];
  probesM: number[];
  leafColor: string;
  /** Illustrative development 0–1 from the phase calendar, scaled by crop. Not a measured plant height. */
  plantHeight: number;
  maize: boolean;
  rainCount: number;
  irrigationCount: number;
  drainage: Arrow | null;
  runoff: Arrow | null;
};

const arrow = (mm: number | null, scale: number): Arrow | null => (mm != null && mm > 0.05 ? { length: 0.18 + Math.min(0.4, mm / scale), width: 0.012 + Math.min(0.03, mm / 600) } : null);

export function profileLayers(s: CropSceneState, progress: number): ProfileLayers {
  const maize = s.land.startsWith('maize2'); const crop = s.land === 'soy' || maize;
  const dev = development({ land: s.land, stage: s.phase, progress, awf: s.waterFraction ?? 0, rain: s.rainMm ?? 0, covered: false });
  const roots = s.rootDepthM != null ? { depthM: Math.min(s.rootDepthM, PROFILE_DEPTH_M - 0.01) } : null;
  const ticks = roots ? [...new Set([0.15, 0.4, 1, 1.5, Math.round(roots.depthM * 100) / 100])].sort((a, b) => a - b) : [];
  return {
    zone: roots ? 'root_zone_depth' : 'root_zone_mean',
    soilColor: s.waterFraction == null ? SOIL_UNKNOWN : lerpHex(SOIL_DRY, SOIL_WET, s.waterFraction),
    waterKnown: s.waterFraction != null,
    roots,
    rulerTicksM: ticks,
    probesM: s.virtualProbes ? [0.15, 0.4] : [],
    leafColor: LEAF[s.stress ?? 'unknown'],
    plantHeight: crop ? dev * (maize ? 2.2 : 0.95) : 0,
    maize,
    rainCount: s.rainParticles,
    irrigationCount: s.irrigationParticles,
    drainage: arrow(s.drainageMm, 60),
    runoff: arrow(s.runoffMm, 30),
  };
}
