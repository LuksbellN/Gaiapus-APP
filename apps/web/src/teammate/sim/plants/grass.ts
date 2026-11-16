// Brachiaria cover (Urochloa spp., generic) and management residue, illustrative (research-botany.md §11).
// - Living cover: a low tussock of basal tillers with long arched blades. No species, inflorescence or biomass is claimed.
// - Residue (straw): loose fragments of blades and stalks lying on the soil at irregular angles, never a flattened
//   tussock. The product scene has no residue signal in its data, so `residuePlan` is used on the demonstration board only.
import { mulberry32 } from '../scene-math';
import type { CoverPose } from '../visual-state';
import { LEAF, STEM, STRAW } from './colors';
import { add, blade, dir, mul, tube, type Detail, type PlantPlan, type V3 } from './plan';

const TILLERS: Record<CoverPose, Record<Detail, number>> = { young: { detail: 4, field: 3, far: 3 }, understory: { detail: 8, field: 5, far: 4 }, living: { detail: 10, field: 8, far: 5 } };
const SCALE: Record<CoverPose, number> = { young: 0.42, understory: 0.72, living: 1 };

export function brachiariaPlan(pose: CoverPose, variant: number, detail: Detail): PlantPlan {
  const base = 4099 + variant * 7919; const r = mulberry32(base); const plan: PlantPlan = [];
  const n = TILLERS[pose][detail]; const scale = SCALE[pose]; const twist = r() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const rn = mulberry32(base + 71 * (k + 1)); const a = rn(), b = rn(), c = rn();
    const yaw = twist + k * 2.399 + (a - 0.5) * 0.6; const lean = 0.2 + b * 0.55; const foot: V3 = mul(dir(yaw, 0), (0.015 + 0.05 * b) * scale);
    const culm = (0.1 + 0.12 * c) * scale; const top = add(foot, mul(dir(yaw, Math.PI / 2 - lean), culm));
    if (detail !== 'far') plan.push(tube('tiller', foot, top, 0.0045 * Math.sqrt(scale), 0.003 * Math.sqrt(scale), STEM.pale));
    const blades = 3;
    for (let j = 0; j < blades; j++) {
      const t = (j + 1) / blades; const from = add(foot, mul(dir(yaw, Math.PI / 2 - lean), culm * t));
      const length = (0.26 + 0.22 * ((a * 7 + j * 3) % 1)) * scale; const color = j === blades - 1 ? LEAF.light : j === 0 ? LEAF.deep : LEAF.mid;
      plan.push(blade('leaf', from, yaw + (j - (blades - 1) / 2) * 0.85 + (c - 0.5) * 0.4, 1.15 - lean * 0.6 - j * 0.08, length, 0.026 * Math.sqrt(scale) * (detail === 'detail' ? 1 : detail === 'field' ? 1.25 : 1.7), 1.25 + b * 0.7, 0.25, detail === 'detail' ? 'strap' : 'lance', color));
    }
  }
  return plan;
}

/**
 * A patch of straw about `size` metres wide. Fragments have different lengths, lie almost flat, overlap and point
 * everywhere: no radial pattern and no link to a tussock. It says "dead residue on the soil", not how much of it.
 */
export function residuePlan(variant: number, detail: Detail, size = 1): PlantPlan {
  const r = mulberry32(8191 + variant * 7919); const plan: PlantPlan = []; const n = detail === 'detail' ? 46 : detail === 'field' ? 18 : 10;
  for (let k = 0; k < n; k++) {
    const x = (r() - 0.5) * size, z = (r() - 0.5) * size, yaw = r() * Math.PI * 2, kind = r(), shade = STRAW[Math.floor(r() * STRAW.length)], lift = 0.004 + r() * 0.03;
    if (kind < 0.22) {
      // A piece of stalk: short, thick, lying down.
      const length = 0.08 + r() * 0.2; const d = dir(yaw, (r() - 0.5) * 0.12);
      plan.push(tube('straw', [x, lift + 0.006, z], add([x, lift + 0.006, z], mul(d, length)), 0.006, 0.005, shade));
    } else {
      // A piece of blade: some flat, some curled upward or twisted over others.
      const length = 0.05 + r() * r() * 0.32; const curl = (r() - 0.35) * 0.9;
      plan.push(blade('straw', [x, lift, z], yaw, 0.04 + Math.max(0, curl) * 0.35, length, 0.012 + r() * 0.02, curl, (r() - 0.5) * 0.5, r() < 0.5 ? 'strap' : 'lance', shade));
    }
  }
  return plan;
}
