// Root geometry for the soil profile, as plain data (no three.js): shared by SoilProfile3D and Profile2D.
//
// Contract
// - `root_depth_m` from the engine (modelled) or from an observation is used as is: label in the same unit, drawn to the
//   profile edge with a "continues below" mark when deeper; the value is never changed to fit the scene.
// - Without a valid depth (crop-simulation-v1 is a single fixed bucket and returns null), roots are ILLUSTRATIVE: they grow
//   with the phase/progress of the crop cycle, carry no centimetres and say so. They never come from a yield model.
// - Effective root depth is not total root length; this module draws an architecture, not a measured biomass.
// - Behaviour: monotonic growth within a cycle (no shrink at maturity); bare fallow and post-harvest days draw no roots
//   (residues are not modelled); a new crop starts from its own establishment; coffee is perennial and follows its age.
// Geometry is deterministic: one fixed skeleton per architecture and plant (seeded), revealed by growth — going back to a
// day reproduces exactly the same root. Visual idea from the Lara simulator (LaraLLC/Hackathon-Nasa-SpaceApps @ 76aaf46,
// one cone per plant); that repository has no licence, so this is an independent implementation.
import { mulberry32, PROFILE_DEPTH_M } from './scene-math';

export type RootArchitecture = 'taproot' | 'fibrous' | 'perennial';
export type RootSource = 'illustrative' | 'modelled' | 'observed';
export type RootInput = {
  land: string;
  phase: string;
  /** 0–1 progress inside the current phase. */
  progress: number;
  rootDepthM: number | null;
  rootDepthSource: 'modelled' | 'observed' | null;
  /** Perennials only: plant age in years, when known. */
  ageYears?: number | null;
};
export type RootSegment = { plant: number; root: number; order: 0 | 1; from: [number, number]; to: [number, number]; radius: number };
export type RootLayer = {
  architecture: RootArchitecture;
  source: RootSource;
  /** 0–1 share of the full skeleton shown. */
  growth: number;
  /** Depth to print (metres) — only for modelled/observed sources, never for illustrative roots. */
  depthLabelM: number | null;
  /** Deepest drawn point (metres, positive down), at most the profile depth. */
  drawDepthM: number;
  continuesBelow: boolean;
  invalidCalculated: boolean;
  ageUnknown: boolean;
  plants: number;
  /** x across the block (m), y depth (m, negative down); sorted by birth so earlier days are a prefix of later ones. */
  segments: RootSegment[];
};

export const MAX_SEGMENTS_PER_PLANT = 96;
const PLANT_X = { taproot: [-1.5, -0.9, -0.3, 0.3, 0.9, 1.5], fibrous: [-1.5, -0.75, 0, 0.75, 1.5], perennial: [-0.9, 0.9] } as const;
/** Illustrative maximum depths used for drawing only (no label). */
const ILLUSTRATIVE_MAX_M: Record<RootArchitecture, number> = { taproot: 1.0, fibrous: 1.2, perennial: 1.4 };
/** Cumulative illustrative growth per phase [start, end]: monotonic through the cycle, flat at maturity. */
const PHASE_GROWTH: Record<string, [number, number]> = {
  establishment: [0.05, 0.25], vegetative: [0.25, 0.85], reproductive: [0.85, 1], maturation: [1, 1], off_season_cover: [0.6, 0.8],
};
const EDGE_M = PROFILE_DEPTH_M - 0.02;

export function architectureOf(land: string): RootArchitecture | null {
  if (land === 'soy' || land.startsWith('bean')) return 'taproot';
  if (land.startsWith('maize') || land === 'brachiaria' || land === 'wheat' || land === 'rice') return 'fibrous';
  if (land.startsWith('coffee')) return 'perennial';
  return null;
}

type Raw = RootSegment & { t0: number; t1: number };
const skeletons = new Map<RootArchitecture, Raw[]>();

/** Full-grown skeleton in unit depth (deepest point = 1), fixed per architecture. */
function skeleton(arch: RootArchitecture): Raw[] {
  const hit = skeletons.get(arch);
  if (hit) return hit;
  const out: Raw[] = [];
  PLANT_X[arch].forEach((px, plant) => {
    const r = mulberry32(arch.length * 7919 + plant * 104729 + 17);
    const line = (root: number, order: 0 | 1, x0: number, y0: number, dx: number, dy: number, n: number, t0: number, t1: number, radius: number) => {
      let x = x0, y = y0;
      for (let i = 0; i < n; i++) {
        const nx = x + dx / n + (r() - 0.5) * 0.03, ny = y + dy / n;
        out.push({ plant, root, order, from: [x, y], to: [nx, ny], radius: radius * (1 - (0.5 * i) / n), t0: t0 + ((t1 - t0) * i) / n, t1: t0 + ((t1 - t0) * (i + 1)) / n });
        x = nx; y = ny;
      }
      return { x, y };
    };
    if (arch === 'fibrous') {
      for (let k = 0; k < 10; k++) {
        const angle = ((k / 9) * 1.3 - 0.65) + (r() - 0.5) * 0.12, length = 0.6 + r() * 0.4;
        const end = line(k, 0, px, 0, Math.sin(angle) * length * 0.45, -Math.cos(angle) * length, 6, 0, length, 0.006);
        line(100 + k, 1, px + (end.x - px) * 0.5, end.y * 0.5, (r() - 0.5) * 0.18, -0.08, 2, length * 0.55, length * 0.8, 0.003);
      }
    } else {
      const lateralCount = arch === 'perennial' ? 8 : 5, spread = arch === 'perennial' ? 0.6 : 0.28;
      line(0, 0, px, 0, (r() - 0.5) * 0.06, -1, 8, 0, 1, arch === 'perennial' ? 0.014 : 0.009);
      for (let k = 0; k < lateralCount; k++) {
        const a = 0.08 + (k / lateralCount) * 0.7, side = k % 2 === 0 ? 1 : -1;
        line(1 + k, 1, px, -a, side * spread * (1 - a * 0.5) * (0.7 + r() * 0.3), -0.05 - r() * 0.1, arch === 'perennial' ? 4 : 3, a + 0.02, Math.min(1, a + 0.35), 0.004);
      }
    }
  });
  out.sort((p, q) => p.t0 - q.t0 || p.plant - q.plant || p.root - q.root);
  skeletons.set(arch, out);
  return out;
}

const validDepth = (v: number | null): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 20;

export function rootLayer(input: RootInput): RootLayer | null {
  const arch = architectureOf(input.land);
  if (!arch) return null;
  let growth: number, ageUnknown = false;
  if (arch === 'perennial') {
    // Perennial: an adult keeps its full system across phases; a young plant follows its age (years).
    if (typeof input.ageYears === 'number' && Number.isFinite(input.ageYears) && input.ageYears >= 0) growth = Math.min(1, 0.25 + (0.75 * input.ageYears) / 3);
    else { growth = 0.7; ageUnknown = true; }
  } else {
    const range = PHASE_GROWTH[input.phase];
    if (!range) return null; // fallow / post-harvest: no living crop roots are drawn
    const p = Math.min(1, Math.max(0, Number.isFinite(input.progress) ? input.progress : 0));
    growth = range[0] + (range[1] - range[0]) * p;
  }
  const calculated = input.rootDepthSource !== null && validDepth(input.rootDepthM);
  const invalidCalculated = input.rootDepthSource !== null && !validDepth(input.rootDepthM);
  const scaleM = calculated ? Math.min(input.rootDepthM as number, EDGE_M) : ILLUSTRATIVE_MAX_M[arch];
  const shown = calculated ? 1 : growth;
  const segments: RootSegment[] = [];
  let deepest = 0;
  for (const s of skeleton(arch)) {
    if (s.t0 >= shown) break;
    const k = s.t1 > shown ? (shown - s.t0) / (s.t1 - s.t0) : 1;
    const to: [number, number] = [s.from[0] + (s.to[0] - s.from[0]) * k, s.from[1] + (s.to[1] - s.from[1]) * k];
    const seg: RootSegment = { plant: s.plant, root: s.root, order: s.order, from: [s.from[0], s.from[1] * scaleM], to: [to[0], to[1] * scaleM], radius: s.radius };
    deepest = Math.max(deepest, -seg.to[1]);
    segments.push(seg);
  }
  return {
    architecture: arch, source: calculated ? (input.rootDepthSource as 'modelled' | 'observed') : 'illustrative', growth: calculated ? 1 : growth,
    depthLabelM: calculated ? (input.rootDepthM as number) : null, drawDepthM: Math.min(deepest, EDGE_M),
    continuesBelow: calculated && (input.rootDepthM as number) > EDGE_M, invalidCalculated, ageUnknown, plants: PLANT_X[arch].length, segments,
  };
}
