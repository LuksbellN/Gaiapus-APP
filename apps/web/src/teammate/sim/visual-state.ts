// Presentation layer between a simulation row and the illustrative plants (no three.js, no React).
// It decides WHAT may be drawn — which plant family, which cover, which organs — and how far inside a phase the
// drawing may go. It never changes a contract, a series or a capability, and it never invents a phenological stage:
//   - the family comes from the row's real `land_cover`; an unknown value is "unsupported", never soybean;
//   - the phase comes from the row's real stage label;
//   - the position inside the phase is used only when BOTH borders of that phase run are present in the original
//     series (before any window is cut). A run that touches the edge of the data, a gap or a short forecast window
//     gets a fixed representative pose instead of being stretched to "0–100 %" of the phase.
// The numbers below (when flowers appear, how fast leaves dry) are artistic parameters, not agronomy.
import { clamp01, lerp, ramp } from './plants/plan';

export type CropFamily = 'soy' | 'maize' | 'bean' | 'rice' | 'wheat' | 'coffee_arabica' | 'coffee_conilon';
export type CropStage = 'establishment' | 'vegetative' | 'reproductive' | 'maturation';
export const CROP_STAGES: readonly CropStage[] = ['establishment', 'vegetative', 'reproductive', 'maturation'];
const isCropStage = (s: string): s is CropStage => (CROP_STAGES as readonly string[]).includes(s);

/** Families the product scene draws: the crops of the rotation that has a daily series. The others live on the demonstration board only. */
export const SCENE_FAMILIES: readonly CropFamily[] = ['soy', 'maize'];

const FAMILY: Record<string, CropFamily> = {
  soy: 'soy', maize: 'maize', maize1: 'maize', maize2: 'maize', bean1: 'bean', bean2: 'bean', rice: 'rice', wheat: 'wheat', wheat_winter: 'wheat',
  coffee_arabica: 'coffee_arabica', coffee_conilon: 'coffee_conilon',
};
export type LandVisual =
  | { kind: 'crop'; family: CropFamily; cover: 'brachiaria' | null }
  | { kind: 'cover'; cover: 'brachiaria' }
  | { kind: 'bare' }
  | { kind: 'unsupported'; land: string };

/** Real `land_cover` → main crop and living cover. Combinations stay combinations ("maize2+brachiaria"). */
export function decodeLand(land: unknown): LandVisual {
  if (typeof land !== 'string' || !land) return { kind: 'unsupported', land: String(land ?? '') };
  if (land === 'bare') return { kind: 'bare' };
  const parts = land.split('+'); const cover = parts.includes('brachiaria') ? 'brachiaria' : null; const crops = parts.filter((p) => p !== 'brachiaria');
  if (crops.length === 0 && cover) return { kind: 'cover', cover };
  // An aggregated cohort (coffee_total_mg), an unknown id or more than one crop never becomes a plant.
  const family = crops.length === 1 ? FAMILY[crops[0]] : undefined;
  return family ? { kind: 'crop', family, cover } : { kind: 'unsupported', land };
}

export type FractionSource = 'full-phase' | 'window-only' | 'unknown';
/** Where a day sits inside its phase run. `fraction` is null unless the whole run is proven by the series itself. */
export type PhasePosition = { source: FractionSource; fraction: number | null; day: number | null; length: number | null };
export const UNKNOWN_POSITION: PhasePosition = { source: 'unknown', fraction: null, day: null, length: null };

const DAY_MS = 86400000;
const dayNumber = (iso: string) => { const t = Date.parse(`${iso}T00:00:00Z`); return Number.isFinite(t) ? Math.round(t / DAY_MS) : NaN; };

/**
 * Phase run around `index` in the ORIGINAL arrays (never a cut window). The run is complete only when a different
 * label exists immediately before and after it and every date involved is valid and one day apart.
 */
export function phaseRunAt(lands: readonly string[], stages: readonly string[], dates: readonly string[], index: number): PhasePosition {
  const n = Math.min(lands.length, stages.length, dates.length);
  if (!Number.isInteger(index) || index < 0 || index >= n) return UNKNOWN_POSITION;
  const same = (i: number) => lands[i] === lands[index] && stages[i] === stages[index];
  let start = index, end = index;
  while (start > 0 && same(start - 1)) start--;
  while (end < n - 1 && same(end + 1)) end++;
  if (start === 0 || end === n - 1) return { source: 'window-only', fraction: null, day: null, length: null };
  // Contiguity from the day before the run to the day after it: a gap makes the borders unproven.
  for (let i = start; i <= end + 1; i++) if (dayNumber(dates[i]) - dayNumber(dates[i - 1]) !== 1) return { source: 'window-only', fraction: null, day: null, length: null };
  const length = end - start + 1;
  return { source: 'full-phase', fraction: length > 1 ? (index - start) / (length - 1) : 0.5, day: index - start + 1, length };
}

/** Fixed pose used when the position inside the phase is not known. Reproductive stays at flowering: no sub-stage is inferred. */
export const REPRESENTATIVE: Record<CropStage, number> = { establishment: 0.5, vegetative: 0.6, reproductive: 0.25, maturation: 0.45 };
/** Fractions are snapped so a day always maps to the same cached geometry (and scrubbing back gives the same plant). */
export const POSE_STEPS = 24;
export function poseFraction(stage: CropStage, position: PhasePosition): number {
  const f = position.source === 'full-phase' && position.fraction != null && Number.isFinite(position.fraction) ? clamp01(position.fraction) : REPRESENTATIVE[stage];
  return Math.round(f * POSE_STEPS) / POSE_STEPS;
}

/**
 * Organ-level state of an annual plant, each 0–1. Separate tracks instead of one "development" scalar:
 * stem height, leaf area, emergence of the reproductive structure, open flowers, fruit presence and filling,
 * leaf colour loss, leaf shedding and drying of stems and fruits.
 */
export type AnnualPose = { height: number; leaf: number; bloom: number; flower: number; fruit: number; fill: number; senescence: number; drop: number; dry: number };
export function annualPose(stage: CropStage, fraction: number): AnnualPose {
  const f = clamp01(fraction); const none = { bloom: 0, flower: 0, fruit: 0, fill: 0, senescence: 0, drop: 0, dry: 0 };
  switch (stage) {
    case 'establishment': return { height: lerp(0.05, 0.18, f), leaf: lerp(0.04, 0.2, f), ...none };
    case 'vegetative': return { height: lerp(0.18, 0.86, f), leaf: lerp(0.2, 0.92, f), ...none };
    case 'reproductive': return {
      height: lerp(0.86, 1, ramp(f, 0, 0.4)), leaf: lerp(0.92, 1, ramp(f, 0, 0.3)), bloom: ramp(f, 0, 0.2),
      // Fruit starts at 45 % of the run: an artistic split between "flowering" and "fruiting", not a measured stage.
      flower: ramp(f, 0, 0.12) * (1 - ramp(f, 0.5, 0.75)), fruit: ramp(f, 0.45, 0.7), fill: ramp(f, 0.5, 1), senescence: 0, drop: 0, dry: 0,
    };
    case 'maturation': return { height: 1, leaf: 1, bloom: 1, flower: 0, fruit: 1, fill: 1, senescence: ramp(f, 0, 0.7), drop: ramp(f, 0.15, 1), dry: ramp(f, 0.25, 1) };
  }
}

/** Living cover drawn with the crop or alone. No biomass, death or residue is inferred. */
export type CoverPose = 'young' | 'understory' | 'living';
export type FieldVisual = {
  land: LandVisual;
  /** The plant to draw in the product scene, or null (bare soil, cover only, or a family the scene does not draw). */
  crop: { family: CropFamily; stage: CropStage; fraction: number; pose: AnnualPose; key: string } | null;
  cover: { pose: CoverPose; key: string } | null;
  /** True when the pose is the fixed representative one (no proven position inside the phase). */
  representative: boolean;
  /** A catalogue crop with a real row that this scene has no plant for: the soil is shown and the caption says so. */
  noPlantFor: CropFamily | null;
  /** A land value this layer does not understand. */
  unknownLand: string | null;
};

export function resolveFieldVisual(land: unknown, stage: unknown, position: PhasePosition = UNKNOWN_POSITION): FieldVisual {
  const decoded = decodeLand(land); const base = { land: decoded, crop: null, cover: null, representative: false, noPlantFor: null, unknownLand: null } satisfies FieldVisual;
  if (decoded.kind === 'bare') return base;
  if (decoded.kind === 'unsupported') return { ...base, unknownLand: decoded.land };
  if (decoded.kind === 'cover') return stage === 'off_season_cover' ? { ...base, cover: { pose: 'living', key: 'brachiaria:living' } } : { ...base, unknownLand: `${decoded.cover}:${String(stage)}` };
  // A crop row with a stage this layer does not know draws nothing rather than guessing.
  if (typeof stage !== 'string' || !isCropStage(stage)) return { ...base, unknownLand: `${String(land)}:${String(stage)}` };
  const coverPose: CoverPose = stage === 'establishment' ? 'young' : 'understory';
  const cover = decoded.cover ? { pose: coverPose, key: `brachiaria:${coverPose}` } : null;
  if (!SCENE_FAMILIES.includes(decoded.family)) return { ...base, cover, noPlantFor: decoded.family };
  const fraction = poseFraction(stage, position);
  return { ...base, cover, representative: position.source !== 'full-phase', crop: { family: decoded.family, stage, fraction, pose: annualPose(stage, fraction), key: `${decoded.family}:${stage}:${Math.round(fraction * POSE_STEPS)}` } };
}

/** Coffee is perennial: age/training and the fruit cycle are separate dimensions, and the adult structure never resets. */
export type CoffeeAge = 'seedling' | 'adult';
export type CoffeeFruit = 'none' | 'flowering' | 'green' | 'ripe' | 'harvested';
export type CoffeePose = { age: CoffeeAge; fruit: CoffeeFruit };
