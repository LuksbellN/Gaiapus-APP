// Wheat (Triticum aestivum), illustrative (research-botany.md §9).
// Silhouette: a few thin culms (tillers), narrow leaves with a short upright flag leaf, and a COMPACT TERMINAL SPIKE:
// a straight central rachis with small spikelets in two alternating rows. It must stay distinguishable from rice by the
// organisation of the inflorescence (compact here, branched there), not by colour.
// Sequence: seedling → tillering → the spike comes out of the flag-leaf sheath tip first while the peduncle lifts it
// above the leaves → grain filling (spikelets get slightly plumper, never a large external fruit) → leaves, culms and
// spikes turn to straw gradually, lower leaves first.
// Awns are a declared choice of this demonstration profile (`WHEAT_PROFILE.awns`), not a rule for every cultivar.
import { mulberry32 } from '../scene-math';
import type { AnnualPose } from '../visual-state';
import { GRAIN, LEAF, STEM } from './colors';
import { add, blade, blob, clamp01, cross, dir, lerp, mixHex, mul, ramp, sub, tube, unit, type Detail, type PlantPlan, type V3 } from './plan';

export const WHEAT_HEIGHT_M = 0.85;
export const WHEAT_PROFILE = { awns: true } as const;
/** Nominal length of a spike, without awns (authoring metres). */
export const WHEAT_SPIKE_M = 0.085;
const CULMS: Record<Detail, number> = { detail: 6, field: 5, far: 5 };
/** Tillers that bear a spike: the late ones stay vegetative. */
const FERTILE: Record<Detail, number> = { detail: 5, field: 4, far: 4 };
const LEAVES: Record<Detail, number> = { detail: 4, field: 3, far: 3 };
/** Spikelets drawn on one spike, the terminal one included. From far away the spike is a single slender volume. */
const SPIKELETS: Record<Detail, number> = { detail: 11, field: 6, far: 0 };

const heading = (d: V3) => ({ yaw: Math.atan2(d[0], d[2]), pitch: Math.asin(Math.max(-1, Math.min(1, d[1]))) });
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function wheatPlan(pose: AnnualPose, variant: number, detail: Detail, opts: { awns?: boolean } = {}): PlantPlan {
  const awned = opts.awns ?? WHEAT_PROFILE.awns;
  const base = 6067 + variant * 7919; const r = mulberry32(base); const plan: PlantPlan = [];
  const twist = r() * Math.PI * 2; const h = WHEAT_HEIGHT_M * pose.height * (0.95 + r() * 0.1);
  // Tillering: culms are added one by one; each keeps its place and its random identity.
  const tillering = lerp(1, CULMS[detail], ramp(pose.leaf, 0.15, 0.7)); const n = Math.max(1, Math.round(tillering));
  const leaves = Math.max(2, Math.round(lerp(2, LEAVES[detail], ramp(pose.leaf, 0.1, 0.85))));
  const r0 = 0.0018 + 0.0022 * pose.height; const width = (0.005 + 0.008 * pose.height) * (detail === 'far' ? 1.5 : 1);

  for (let k = 0; k < n; k++) {
    const rn = mulberry32(base + 71 * (k + 1)); const a = rn(), b = rn(), c = rn(), d = rn(), e = rn();
    const vigour = 0.6 + 0.4 * (k === 0 ? 1 : clamp01(tillering - k));
    const yaw = twist + k * 2.399 + (a - 0.5) * 0.5; const lean = k === 0 ? 0.02 + b * 0.04 : 0.05 + b * 0.13;
    const axis = dir(yaw, Math.PI / 2 - lean); const foot: V3 = mul(dir(yaw, 0), k === 0 ? 0 : 0.01 + 0.02 * b);
    const on = (s: number): V3 => add(foot, mul(axis, s));
    // `full` is the culm up to the base of a fully headed spike; the flag leaf sits at `flagAt`, the peduncle above it.
    const full = h * 0.86 * (0.88 + 0.12 * c) * vigour; const flagAt = full * 0.72; const spike = WHEAT_SPIKE_M * (0.9 + 0.2 * e) * vigour;
    const delay = k === 0 ? 0 : 0.3 + 0.7 * d;
    const emerged = k < FERTILE[detail] ? ramp(pose.bloom, 0.05 + 0.2 * delay, 0.7 + 0.3 * delay) : 0;
    // Heading: the spike slides up out of the sheath; only what is above the flag-leaf node is visible.
    const topAt = flagAt + emerged * (full - flagAt + spike); const baseAt = topAt - spike; const sheath = Math.max(flagAt, baseAt);
    plan.push(tube('tiller', foot, on(sheath), r0, r0 * 0.6, mixHex(STEM.green, LEAF.straw, clamp01(pose.dry * 1.15 - c * 0.15))));

    for (let j = 0; j < leaves; j++) {
      const t = (j + 1) / leaves; const flag = j === leaves - 1; const pick = (a * 7 + j * 3) % 1;
      // The lowest leaf of a culm dries out and disappears as the plant matures (a different day for each culm).
      if (j === 0 && leaves > 2 && pose.drop > 0.3 + 0.6 * e) continue;
      // Lower leaves turn first; the flag leaf is the last one to lose its green.
      const s = clamp01(pose.senescence * 1.7 - t * 0.7 - (c - 0.5) * 0.2);
      const green = flag ? LEAF.light : j === 0 ? LEAF.deep : LEAF.mid;
      const color = s < 0.5 ? mixHex(green, LEAF.yellow, s * 2) : mixHex(LEAF.yellow, LEAF.straw, (s - 0.5) * 2);
      const length = h * (flag ? 0.2 : 0.27 + 0.08 * pick) * vigour;
      plan.push(blade('leaf', on(flagAt * t), yaw + j * Math.PI + (d - 0.5) * 0.9, (flag ? 1.1 : lerp(0.8, 1, t)) - lean * 0.4, length, width, (flag ? 0.5 + 0.4 * e : 0.9 + 0.6 * pick) + s * 0.8, 0.3, detail === 'far' ? 'lance' : 'strap', color, mixHex(color, LEAF.straw, clamp01(pose.senescence * 1.4))));
    }

    if (emerged <= 0) continue;
    // Green through grain filling, then gold and finally straw as the plant dries.
    const ripe = clamp01(0.3 * ramp(pose.fill, 0.4, 1) + 0.35 * pose.senescence + 0.55 * pose.dry - 0.1 * e * (1 - pose.dry));
    const color = ripe < 0.6 ? mixHex(GRAIN.green, GRAIN.gold, ripe / 0.6) : mixHex(GRAIN.gold, GRAIN.straw, (ripe - 0.6) / 0.4);
    const awnColor = mixHex(color, GRAIN.straw, 0.3); const swell = 0.85 + 0.2 * pose.fill;
    // The two rows of spikelets lie in one plane through the rachis; each spike has its own plane.
    const flat = dir(yaw + Math.PI / 2 + (d - 0.5) * 2, 0); const side = unit(sub(flat, mul(axis, dot(flat, axis)))); const face = cross(axis, side);
    if (detail === 'far') { plan.push(blob('spike', on((sheath + topAt) / 2), [0.0075 * swell, (topAt - sheath) / 2, 0.006 * swell], color, axis)); continue; }

    plan.push(tube('spike', on(sheath), on(topAt), 0.0016, 0.001, mixHex(color, STEM.pale, 0.3)));
    const many = SPIKELETS[detail]; const fat = detail === 'field' ? 1.3 : 1; const long = Math.max(0.0075, (spike / many) * 0.74);
    for (let i = 0; i < many; i++) {
      const terminal = i === many - 1; const s = baseAt + spike * (terminal ? 0.96 : (i + 0.7) / (many + 0.2));
      if (s < flagAt + 0.004) continue; // still inside the sheath
      const hand = terminal ? 0 : i % 2 ? 1 : -1; const out = unit(add(axis, mul(side, hand * 0.5)));
      const centre = add(on(s), mul(side, hand * 0.0046 * fat));
      plan.push(blob('spike', centre, [0.0042 * swell * fat, long, 0.0036 * swell * fat], color, out));
      if (awned && detail === 'detail') {
        // One fine awn per spikelet, pointing up and slightly outward.
        const bristle = unit(add(add(axis, mul(side, hand * 0.3)), mul(face, (((e * 13 + i * 0.618) % 1) - 0.5) * 0.25)));
        const from = add(centre, mul(out, long));
        plan.push(tube('awn', from, add(from, mul(bristle, 0.048 + 0.02 * ((d * 11 + i * 0.37) % 1))), 0.0007, 0.0003, awnColor));
      }
    }
    // A 0.7 mm awn is invisible from the field: three thin slivers keep the bristly outline of an awned spike.
    if (awned && detail === 'field') for (const hand of [-1, 1, 0]) {
      const s = baseAt + spike * (hand === 0 ? 1 : hand === 1 ? 0.75 : 0.5);
      if (s < flagAt + 0.004) continue;
      const aim = heading(unit(add(axis, mul(side, hand * 0.3))));
      plan.push(blade('awn', on(s), aim.yaw, aim.pitch, 0.06, 0.004, 0, 0, 'lance', awnColor));
    }
  }
  return plan;
}
