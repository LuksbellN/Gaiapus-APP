// Soybean (Glycine max), illustrative. Reference profile: a bushy plant with a main stem, a few basal branches,
// trifoliolate leaves and SHORT closed pods clustered at the nodes (research-botany.md §5).
// Sequence of organs: cotyledons → pair of simple leaves → trifoliolates and branches → small flowers in the axils →
// pods that fill → leaves yellow and fall from the bottom up, leaving the dry stem and pods.
// Sizes are artistic; determinate/indeterminate cultivars differ and none is claimed here.
import { mulberry32 } from '../scene-math';
import type { AnnualPose } from '../visual-state';
import { FLOWER, LEAF, POD, STEM } from './colors';
import { add, blade, blob, clamp01, dir, lerp, mixHex, mul, pod, ramp, tube, type Detail, type PlantPlan, type V3 } from './plan';

export const SOY_HEIGHT_M = 0.92;
const NODES: Record<Detail, number> = { detail: 13, field: 9, far: 6 };
/** Fewer leaves at the lighter levels are drawn larger, so the canopy keeps its mass from far away. */
const LEAF_MASS: Record<Detail, number> = { detail: 1, field: 1.18, far: 1.45 };

/** One compound leaf: petiole and three leaflets (terminal + two laterals). */
export function trifoliate(plan: PlantPlan, from: V3, yaw: number, petiole: number, length: number, width: number, color: string, detail: Detail, opts: { rise?: number; droop?: number; petioleColor?: string } = {}) {
  const tip = add(from, mul(dir(yaw, opts.rise ?? 0.75), petiole));
  if (detail !== 'far' && petiole > 0.01) plan.push(tube('petiole', from, tip, 0.0035, 0.0025, opts.petioleColor ?? STEM.green));
  const droop = opts.droop ?? 0.55;
  plan.push(blade('leaflet', tip, yaw, 0.12, length, width, droop, 0.18, 'ovate', color));
  plan.push(blade('leaflet', tip, yaw - 1.15, 0.02, length * 0.88, width * 0.92, droop + 0.1, 0.18, 'ovate', color));
  plan.push(blade('leaflet', tip, yaw + 1.15, 0.02, length * 0.88, width * 0.92, droop + 0.1, 0.18, 'ovate', color));
}

const leafColor = (u: number, newest: boolean, senescence: number) => {
  const green = newest ? LEAF.young : u < 0.4 ? LEAF.deep : u < 0.75 ? LEAF.mid : LEAF.light;
  // Lower leaves lose colour first; the last shade before falling is straw.
  const s = clamp01(senescence * 1.5 - u * 0.5);
  return s < 0.6 ? mixHex(green, LEAF.yellow, s / 0.6) : mixHex(LEAF.yellow, LEAF.straw, (s - 0.6) / 0.4);
};

export function soyPlan(pose: AnnualPose, variant: number, detail: Detail): PlantPlan {
  const base = 1013 + variant * 7919; const r = mulberry32(base); const plan: PlantPlan = [];
  const h = SOY_HEIGHT_M * pose.height * (0.94 + r() * 0.12); const twist = r() * Math.PI * 2; const lean: V3 = [(r() - 0.5) * 0.06, 1, (r() - 0.5) * 0.06];
  const at = (y: number): V3 => [lean[0] * y, y, lean[2] * y];
  const stemColor = mixHex(STEM.green, STEM.dry, pose.dry); const r0 = 0.0035 + 0.0075 * pose.height;
  plan.push(tube('stem', at(0), at(h), r0, r0 * 0.45, stemColor));

  // Seedling: cotyledons, then the pair of simple (unifoliolate) leaves. Both give way to the trifoliolates.
  if (pose.leaf < 0.32) {
    const fade = ramp(pose.leaf, 0.2, 0.32); const y = h * lerp(0.55, 0.12, ramp(pose.leaf, 0.04, 0.3)); const size = lerp(0.9, 1.15, ramp(pose.leaf, 0.04, 0.12)) * (1 - 0.4 * fade);
    for (const side of [0, Math.PI]) plan.push(blob('cotyledon', add(at(y), mul(dir(twist + side, 0.25), 0.019 * size)), [0.011 * size, 0.019 * size, 0.0045], mixHex(LEAF.young, LEAF.yellow, fade), dir(twist + side, 0.25)));
  }
  if (pose.leaf >= 0.07 && pose.leaf < 0.45) {
    const size = ramp(pose.leaf, 0.07, 0.16); const y = h * lerp(0.92, 0.2, ramp(pose.leaf, 0.12, 0.4));
    for (const side of [Math.PI / 2, -Math.PI / 2]) plan.push(blade('leaf', at(y), twist + side, 0.35, 0.03 + 0.035 * size, 0.022 + 0.024 * size, 0.5, 0.18, 'ovate', LEAF.light));
  }

  const max = NODES[detail]; const shown = pose.leaf < 0.12 ? 0 : Math.max(1, Math.round(max * ramp(pose.leaf, 0.1, 0.95)));
  const branches = detail === 'far' ? 3 : 5; const branchGrowth = ramp(pose.leaf, 0.45, 0.95);
  for (let i = 0; i < shown; i++) {
    const rn = mulberry32(base + 31 * (i + 1)); const jitter = rn(), shedOrder = rn(), podPick = rn(), size0 = rn();
    const u = (i + 1) / (shown + 0.4); const y = h * (0.14 + 0.8 * u); const yaw = twist + i * 2.399 + (jitter - 0.5) * 0.35;
    const age = clamp01((shown - i) / 2.2); const size = (0.55 + 0.45 * age) * (0.92 + size0 * 0.16); const blade = size * LEAF_MASS[detail];
    const newest = i === shown - 1 && pose.bloom < 0.5;
    // Leaves fall from the bottom up; the order is fixed per plant so scrubbing back restores the same leaves.
    const shed = (i + shedOrder * 1.4) / (shown + 1.4) < pose.drop * 1.02;
    const color = leafColor(u, newest, pose.senescence);
    if (!shed) trifoliate(plan, at(y), yaw, 0.15 * size * (1.2 - 0.35 * u), 0.13 * blade, 0.086 * blade, color, detail, { petioleColor: stemColor });

    const onBranch = i >= 1 && i <= branches && branchGrowth > 0;
    let branchTip: V3 | null = null;
    if (onBranch) {
      const length = 0.34 * branchGrowth * (0.8 + jitter * 0.4); const byaw = yaw + 0.55; const d = dir(byaw, 0.78);
      branchTip = add(at(y), mul(d, length));
      plan.push(tube('branch', at(y), branchTip, r0 * 0.5, r0 * 0.28, stemColor));
      const leaves = detail === 'detail' ? 3 : detail === 'field' ? 2 : 1;
      for (let k = 0; k < leaves; k++) {
        const t = (k + 1) / leaves; const shedB = (i + k * 0.6 + shedOrder) / (shown + 2) < pose.drop * 1.02;
        if (!shedB) trifoliate(plan, add(at(y), mul(d, length * t)), byaw + (k % 2 ? 1.3 : -1.1) * (t < 1 ? 1 : 0.2), 0.1 * size, 0.115 * blade, 0.076 * blade, leafColor(u + 0.1, false, pose.senescence), detail, { petioleColor: stemColor });
      }
    }

    // Small flowers in the leaf axils: a close-up detail. In the field view the change of stage reads through the canopy.
    if (pose.flower > 0 && detail === 'detail' && i >= 1) for (let k = 0; k < 3; k++) {
      const c = add(at(y + k * 0.011), mul(dir(yaw + (k - 1) * 0.5, 0.5), 0.016));
      plan.push(blob('flower', c, [0.0055 * pose.flower, 0.0075 * pose.flower, 0.005 * pose.flower], k === 1 ? mixHex(FLOWER.soy, '#FFFFFF', 0.45) : FLOWER.soy, dir(yaw, 0.6)));
    }

    // Short closed pods, clustered at the node (2–4 per node). They keep their place and dry with the plant.
    if (pose.fruit > 0 && i >= 1) {
      const podColor = mixHex(POD.green, POD.dry, pose.dry); const n = detail === 'detail' ? 2 + Math.round(podPick * 2) : detail === 'field' ? 2 : 1;
      const length = 0.052 * (0.5 + 0.5 * pose.fill) * (0.4 + 0.6 * pose.fruit), radius = (0.0042 + 0.0038 * pose.fill) * (0.5 + 0.5 * pose.fruit);
      const cluster = (origin: V3, around: number, many: number) => { for (let k = 0; k < many; k++) { const a = around + (k - (many - 1) / 2) * 0.75; plan.push(pod('pod', add(origin, mul(dir(a, 0), 0.008)), dir(a, -0.75 + (k % 2) * 0.25), length, radius, 0.12, podColor)); } };
      cluster(at(y), yaw + 0.9, n);
      if (branchTip && detail !== 'far') cluster(add(at(y), mul(add(branchTip, mul(at(y), -1)), 0.6)), yaw - 0.6, detail === 'detail' ? 2 : 1);
    }
  }
  // Growing tip: a small young trifoliolate until the plant stops making leaves.
  if (shown > 0 && pose.drop < 0.6) trifoliate(plan, at(h), twist + shown * 2.399, 0.035, 0.07 * (0.6 + 0.4 * pose.leaf), 0.046 * (0.6 + 0.4 * pose.leaf), leafColor(1, pose.bloom < 0.5, pose.senescence), detail, { rise: 1.0, petioleColor: stemColor });
  return plan;
}
