// Rice (Oryza sativa), illustrative — an upland-neutral profile (research-botany.md §8).
// NO water is ever drawn: a flooded paddy needs an explicit cultivation mode, which `crop === 'rice'` does not give.
// Silhouette: a tussock of several thin culms (tillers) with narrow arched leaves. The inflorescence is a BRANCHED
// panicle — a slender axis with lateral branches that carry the small grains — never the compact spike of wheat.
// Sequence: seedling → tillering (no external panicle: its initiation is internal) → the panicle comes out of the
// flag-leaf sheath tip first and upright → it opens and nods more and more as the grain fills → grains turn gold and
// the plant loses its green from the lower leaves up. Culms keep standing: only the panicles bend, each by its own amount.
// Tiller count, panicle size and colours are artistic parameters, not a cultivar description.
import { mulberry32 } from '../scene-math';
import type { AnnualPose } from '../visual-state';
import { GRAIN, LEAF, STEM } from './colors';
import { add, blade, blob, clamp01, cross, dir, lerp, mixHex, mul, ramp, tube, unit, type Detail, type PlantPlan, type V3 } from './plan';

export const RICE_HEIGHT_M = 0.95;
/** Nominal length of a fully emerged panicle (authoring metres). */
export const RICE_PANICLE_M = 0.23;
const CULMS: Record<Detail, number> = { detail: 7, field: 6, far: 5 };
/** Tillers that bear a panicle: the late ones stay vegetative. */
const FERTILE: Record<Detail, number> = { detail: 5, field: 4, far: 4 };
const LEAVES: Record<Detail, number> = { detail: 4, field: 3, far: 3 };
const BRANCHES: Record<Detail, number> = { detail: 8, field: 5, far: 3 };

const heading = (d: V3) => ({ yaw: Math.atan2(d[0], d[2]), pitch: Math.asin(Math.max(-1, Math.min(1, d[1]))) });
/** Point and direction at fraction `t` of a line that starts like a blade (`pitch`) and bends down by `droop`. */
function curve(at: V3, yaw: number, pitch: number, droop: number, length: number, t: number): { p: V3; d: V3 } {
  const steps = Math.max(1, Math.ceil(t * 12)); let p = at;
  for (let k = 0; k < steps; k++) p = add(p, mul(dir(yaw, pitch - droop * Math.pow((t * (k + 0.5)) / steps, 1.35)), (length * t) / steps));
  return { p, d: dir(yaw, pitch - droop * Math.pow(t, 1.35)) };
}

export function ricePlan(pose: AnnualPose, variant: number, detail: Detail): PlantPlan {
  const base = 5059 + variant * 7919; const r = mulberry32(base); const plan: PlantPlan = [];
  const twist = r() * Math.PI * 2; const h = RICE_HEIGHT_M * pose.height * (0.94 + r() * 0.12);
  // Tillering: the tussock gains culms one by one; each keeps its place and its random identity.
  const tillering = lerp(1, CULMS[detail], ramp(pose.leaf, 0.12, 0.75)); const n = Math.max(1, Math.round(tillering));
  const leaves = Math.max(2, Math.round(lerp(2, LEAVES[detail], ramp(pose.leaf, 0.1, 0.85))));
  const r0 = 0.002 + 0.0024 * pose.height; const width = (0.006 + 0.008 * pose.height) * (detail === 'far' ? 1.5 : 1);

  for (let k = 0; k < n; k++) {
    const rn = mulberry32(base + 71 * (k + 1)); const a = rn(), b = rn(), c = rn(), d = rn(), e = rn();
    const vigour = 0.6 + 0.4 * (k === 0 ? 1 : clamp01(tillering - k));
    const yaw = twist + k * 2.399 + (a - 0.5) * 0.5;
    // The main culm is nearly upright, the tillers lean outward. Drying adds a small, uneven lean — nothing lodges.
    const lean = (k === 0 ? 0.03 + b * 0.05 : 0.08 + b * 0.18) + 0.05 * pose.dry * c;
    const up = Math.PI / 2 - lean; const axis = dir(yaw, up); const foot: V3 = mul(dir(yaw, 0), k === 0 ? 0 : 0.012 + 0.03 * b);
    const culm = h * 0.7 * (0.86 + 0.14 * c) * vigour; const top = add(foot, mul(axis, culm));
    plan.push(tube('tiller', foot, top, r0, r0 * 0.6, mixHex(STEM.pale, LEAF.straw, clamp01(pose.dry * 1.15 - c * 0.15))));

    for (let j = 0; j < leaves; j++) {
      const t = (j + 1) / leaves; const flag = j === leaves - 1; const pick = (a * 7 + j * 3) % 1;
      // The lowest leaf of a culm dries out and disappears as the plant matures (a different day for each culm).
      if (j === 0 && leaves > 2 && pose.drop > 0.3 + 0.6 * e) continue;
      // Lower leaves lose their green first; the flag leaf is the last one to turn.
      const s = clamp01(pose.senescence * 1.7 - t * 0.7 - (c - 0.5) * 0.2);
      const green = flag ? LEAF.light : j === 0 ? LEAF.deep : LEAF.mid;
      const color = s < 0.5 ? mixHex(green, LEAF.yellow, s * 2) : mixHex(LEAF.yellow, LEAF.straw, (s - 0.5) * 2);
      const length = h * (flag ? 0.3 : 0.36 + 0.1 * pick) * vigour;
      plan.push(blade('leaf', add(foot, mul(axis, culm * t)), yaw + j * 2.4 + (d - 0.5) * 0.9, (flag ? 1.25 : lerp(1, 1.2, t)) - lean * 0.4, length, width, (flag ? 0.45 + 0.35 * e : 0.75 + 0.55 * pick) + s * 0.7, 0.3, detail === 'far' ? 'lance' : 'strap', color, mixHex(color, LEAF.straw, clamp01(pose.senescence * 1.4))));
    }

    // Panicle. Each fertile culm heads on its own day; the panicle leaves the sheath tip first, so the upper branches
    // are seen before the lower ones. Nothing is drawn while it is still inside the sheath.
    const delay = k === 0 ? 0 : 0.3 + 0.7 * d;
    const emerged = k < FERTILE[detail] ? ramp(pose.bloom, 0.06 + 0.2 * delay, 0.7 + 0.3 * delay) : 0;
    if (emerged <= 0) continue;
    const full = RICE_PANICLE_M * (0.88 + 0.24 * e) * vigour; const out = full * emerged; const hidden = full - out;
    // Upright while it emerges; the weight of the filling grain bends it, each panicle by a different amount.
    const bend = (0.25 + pose.fill * (0.95 + 0.75 * b) + 0.3 * pose.dry * c) * Math.pow(emerged, 1.5);
    const ripe = clamp01(0.6 * ramp(pose.fill, 0.35, 1) + 0.5 * pose.dry - 0.12 * e * (1 - pose.dry));
    const grainColor = ripe < 0.7 ? mixHex(GRAIN.green, GRAIN.gold, ripe / 0.7) : mixHex(GRAIN.gold, GRAIN.straw, ((ripe - 0.7) / 0.3) * 0.6);
    const axisColor = mixHex(STEM.pale, GRAIN.straw, ripe);
    if (detail === 'detail') { const segments = 4; let from = top; for (let i = 1; i <= segments; i++) { const to = curve(top, yaw, up, bend, out, i / segments).p; plan.push(tube('panicle', from, to, lerp(0.0016, 0.0009, (i - 1) / segments), lerp(0.0016, 0.0009, i / segments), axisColor)); from = to; } }
    else plan.push(blade('panicle', top, yaw, up, out, detail === 'field' ? 0.007 : 0.011, bend, 0, detail === 'field' ? 'strap' : 'lance', axisColor));

    const many = BRANCHES[detail]; const across: V3 = [Math.cos(yaw), 0, -Math.sin(yaw)]; const open = ramp(emerged, 0.5, 1);
    for (let j = 0; j < many; j++) {
      // j = 0 is the branch nearest to the tip. A branch exists only once its node has left the sheath.
      const s = full * (1 - (j + 0.6) / (many + 0.4)) - hidden;
      if (s < 0.004) continue;
      const node = curve(top, yaw, up, bend, out, s / out); const turn = j * 2.399 + e * 6;
      const outward = add(mul(across, Math.cos(turn)), mul(cross(node.d, across), Math.sin(turn)));
      // Branches start pressed to the axis, spread once the panicle is out and hang as the grain gets heavy.
      const spread = lerp(0.18, 0.5, open); const hang = 0.12 + 0.45 * pose.fill;
      const bd = unit(add(add(mul(node.d, Math.cos(spread)), mul(outward, Math.sin(spread))), [0, -hang, 0]));
      const length = full * lerp(0.2, 0.42, (j + 1) / many);
      if (detail === 'detail') {
        plan.push(tube('panicle', node.p, add(node.p, mul(bd, length)), 0.001, 0.0006, axisColor));
        // Individual grains (spikelets) along the branch: slender, pointed, pressed to it. They are there from heading
        // on and only get a little plumper and more golden — never a large fruit.
        const grains = j < many / 2 ? 3 : 4; const aside = unit(cross(bd, [0.31, 0.2, 0.93]));
        for (let i = 0; i < grains; i++) {
          const hand = (i + j) % 2 ? 1 : -1; const g0 = add(add(node.p, mul(bd, (length * (i + 0.9)) / (grains + 0.3))), mul(aside, hand * 0.0016));
          const gd = unit(add(add(bd, mul(aside, hand * 0.45)), [0, -0.25 * pose.fill, 0]));
          plan.push(tube('grain', g0, add(g0, mul(gd, 0.0095 * (0.8 + 0.2 * pose.fill))), 0.0018 + 0.0011 * pose.fill, 0.0005, grainColor));
        }
      } else {
        // Seen from the field, a branch is a thin sliver and its grains one slender cluster along it.
        const aim = heading(bd);
        plan.push(blade('panicle', node.p, aim.yaw, aim.pitch, length, 0.006, 0.2 * pose.fill, 0, 'lance', axisColor));
        plan.push(blob('grain', add(node.p, mul(bd, length * 0.58)), [0.0052 * (0.8 + 0.2 * pose.fill), length * 0.4, 0.0052 * (0.8 + 0.2 * pose.fill)], grainColor, bd));
      }
    }
  }
  return plan;
}
