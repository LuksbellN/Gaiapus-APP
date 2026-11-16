// Common bean (Phaseolus vulgaris), illustrative — an ERECT / SEMI-ERECT DEMONSTRATION PROFILE (research-botany.md §7).
// Growth habit and species are not in the contract: this is one declared bush profile, not "every bean". No trellis,
// no vine. `bean1` and `bean2` resolve to this same profile (a season is not a species).
// It shares the trifoliolate principle with soybean but not its silhouette: fewer nodes, longer petioles and wider
// leaflets give a more open canopy, and the pods are LONG, narrow and pendant, one or two per node.
// Sequence of organs: cotyledons → pair of simple primary leaves → trifoliolates and a few basal branches →
// buds and flowers in the axils → pods that lengthen, then fill → pods lose their green and dry while the canopy thins.
// Pods stay closed: no loose seed is ever drawn. Sizes and colours are artistic, not a cultivar description.
import { mulberry32 } from '../scene-math';
import type { AnnualPose } from '../visual-state';
import { BEAN_POD, FLOWER, LEAF, STEM } from './colors';
import { add, blade, blob, clamp01, dir, lerp, mixHex, mul, pod, ramp, sub, tube, type Detail, type PlantPlan, type V3 } from './plan';
import { trifoliate } from './soy';

export const BEAN_HEIGHT_M = 0.5;
const NODES: Record<Detail, number> = { detail: 7, field: 6, far: 5 };
const BRANCHES: Record<Detail, number> = { detail: 3, field: 3, far: 2 };
/** Length of a full pod, shortest to longest (authoring metres). */
const POD_LENGTH_M = [0.102, 0.128] as const;
/** Closed bud, before the corolla shows. */
const BUD = '#B9CF8E';

const leafColor = (u: number, newest: boolean, senescence: number) => {
  const green = newest ? LEAF.young : u < 0.4 ? LEAF.deep : u < 0.75 ? LEAF.mid : LEAF.light;
  // Lower leaves lose colour first; the last shade before falling is straw.
  const s = clamp01(senescence * 1.5 - u * 0.5);
  return s < 0.6 ? mixHex(green, LEAF.yellow, s / 0.6) : mixHex(LEAF.yellow, LEAF.straw, (s - 0.6) / 0.4);
};

export function beanPlan(pose: AnnualPose, variant: number, detail: Detail): PlantPlan {
  const base = 3049 + variant * 7919; const r = mulberry32(base); const plan: PlantPlan = [];
  const h = BEAN_HEIGHT_M * pose.height * (0.93 + r() * 0.14); const twist = r() * Math.PI * 2; const lean: V3 = [(r() - 0.5) * 0.08, 1, (r() - 0.5) * 0.08];
  const at = (y: number): V3 => [lean[0] * y, y, lean[2] * y];
  const stemColor = mixHex(STEM.green, STEM.dry, pose.dry); const r0 = 0.003 + 0.0055 * pose.height;
  plan.push(tube('stem', at(0), at(h), r0, r0 * 0.45, stemColor));

  // Seedling: thick cotyledons lifted by the hypocotyl, then the opposite pair of simple, heart-shaped primary leaves.
  if (pose.leaf < 0.3) {
    const fade = ramp(pose.leaf, 0.18, 0.3); const y = h * lerp(0.6, 0.1, ramp(pose.leaf, 0.04, 0.28)); const size = lerp(0.9, 1.2, ramp(pose.leaf, 0.04, 0.12)) * (1 - 0.45 * fade);
    for (const side of [0, Math.PI]) plan.push(blob('cotyledon', add(at(y), mul(dir(twist + side, 0.2), 0.02 * size)), [0.012 * size, 0.021 * size, 0.0055 * size], mixHex(LEAF.young, LEAF.yellow, fade), dir(twist + side, 0.2)));
  }
  if (pose.leaf >= 0.07 && pose.leaf < 0.6) {
    const size = ramp(pose.leaf, 0.07, 0.18); const y = h * lerp(0.92, 0.14, ramp(pose.leaf, 0.12, 0.45)); const old = ramp(pose.leaf, 0.42, 0.6);
    for (const side of [Math.PI / 2, -Math.PI / 2]) plan.push(blade('leaf', at(y), twist + side, 0.3, 0.035 + 0.05 * size, 0.03 + 0.042 * size, 0.5 + 0.3 * old, 0.16, 'ovate', mixHex(LEAF.light, LEAF.yellow, old)));
  }

  /** One long pod hanging from `origin`. It lengthens first and thickens with grain filling; it never opens. */
  const hang = (origin: V3, around: number, pick: number, late: number) => {
    const length = lerp(POD_LENGTH_M[0], POD_LENGTH_M[1], pick) * lerp(0.3, 1, pose.fruit) * (0.85 + 0.15 * pose.fill);
    const radius = (0.0028 + 0.0036 * pose.fill) * (0.5 + 0.5 * pose.fruit);
    const start = add(origin, mul(dir(around, 0), 0.012)); const room = start[1] - 0.012;
    if (room <= 0) return;
    // Pendant, but a pod never goes into the soil: low pods hang at a shallower angle.
    const pitch = -Math.asin(Math.min(Math.sin(1.18 + pick * 0.17), room / length));
    // Pods lose their green one after the other, not all on the same day.
    plan.push(pod('pod', start, dir(around, pitch), length, radius, 0.08, mixHex(BEAN_POD.green, BEAN_POD.dry, clamp01(pose.dry * 1.3 - late * 0.3))));
  };

  const max = NODES[detail]; const shown = pose.leaf < 0.14 ? 0 : Math.max(1, Math.round(max * ramp(pose.leaf, 0.12, 0.95)));
  const branches = BRANCHES[detail]; const branchGrowth = ramp(pose.leaf, 0.5, 0.95);
  // From far away there are fewer leaves, each a little larger, so the canopy keeps its mass.
  const mass = detail === 'far' ? 1.25 : 1;
  for (let i = 0; i < shown; i++) {
    const rn = mulberry32(base + 37 * (i + 1)); const jitter = rn(), shedOrder = rn(), podPick = rn(), size0 = rn(), podSize = rn();
    const u = (i + 1) / (shown + 0.4); const y = h * (0.18 + 0.76 * u); const yaw = twist + i * 2.399 + (jitter - 0.5) * 0.4;
    const age = clamp01((shown - i) / 2); const size = (0.55 + 0.45 * age) * (0.92 + size0 * 0.16);
    const newest = i === shown - 1 && pose.bloom < 0.5;
    // Leaves fall from the bottom up; the order is fixed per plant so scrubbing back restores the same leaves.
    const shed = (i + shedOrder * 1.4) / (shown + 1.4) < pose.drop * 1.02;
    // Long petioles (longest at the base) and wide leaflets: the canopy is open, the stem stays readable.
    if (!shed) trifoliate(plan, at(y), yaw, 0.14 * size * (1.25 - 0.35 * u), 0.105 * size * mass, 0.082 * size * mass, leafColor(u, newest, pose.senescence), detail, { rise: 0.6, droop: 0.5, petioleColor: stemColor });

    let onBranch: V3 | null = null;
    if (i >= 1 && i <= branches && branchGrowth > 0) {
      const length = 0.2 * branchGrowth * (0.8 + jitter * 0.4); const byaw = yaw + 0.6; const d = dir(byaw, 0.7); const tip = add(at(y), mul(d, length));
      plan.push(tube('branch', at(y), tip, r0 * 0.5, r0 * 0.28, stemColor));
      onBranch = add(at(y), mul(sub(tip, at(y)), 0.6));
      const leaves = detail === 'detail' ? 2 : 1;
      for (let k = 0; k < leaves; k++) {
        const t = (k + 1) / leaves; const shedB = (i + k * 0.6 + shedOrder) / (shown + 2) < pose.drop * 1.02;
        if (!shedB) trifoliate(plan, add(at(y), mul(d, length * t)), byaw + (t < 1 ? -1.2 : 0.2), 0.09 * size, 0.092 * size * mass, 0.072 * size * mass, leafColor(u + 0.1, false, pose.senescence), detail, { rise: 0.6, droop: 0.5, petioleColor: stemColor });
      }
    }

    // Buds, then small open flowers on a short stalk in the leaf axil. Too small to matter from far away.
    if (pose.flower > 0 && detail !== 'far' && i >= 1) {
      const open = ramp(pose.flower, 0.2, 0.8); const scale = 0.5 + 0.5 * pose.flower; const many = detail === 'detail' ? 2 : 1;
      for (let k = 0; k < many; k++) {
        const a = yaw + 0.8 + k * 0.7; const c = add(at(y + k * 0.012), mul(dir(a, 0.5), 0.03));
        plan.push(blob('flower', c, [0.0065 * scale, 0.0085 * scale, 0.0055 * scale], mixHex(BUD, FLOWER.bean, open), dir(a, 0.6)));
      }
    }

    // Long narrow pods, one or two per node (never a tight cluster), hanging below the leaves.
    if (pose.fruit > 0 && i >= 1) {
      const many = detail === 'far' ? 1 : podPick > 0.45 ? 2 : 1;
      for (let k = 0; k < many; k++) hang(at(y), yaw + 0.9 + (k - (many - 1) / 2) * 1.2, (podSize + k * 0.37) % 1, podPick);
      if (onBranch && detail !== 'far') hang(onBranch, yaw - 0.7, (podSize + 0.61) % 1, podPick);
    }
  }
  // Growing tip: a small young trifoliolate until the plant stops making leaves.
  if (shown > 0 && pose.drop < 0.6) trifoliate(plan, at(h), twist + shown * 2.399, 0.04, 0.07 * (0.6 + 0.4 * pose.leaf), 0.054 * (0.6 + 0.4 * pose.leaf), leafColor(1, pose.bloom < 0.5, pose.senescence), detail, { rise: 1.0, petioleColor: stemColor });
  return plan;
}
