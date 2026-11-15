// Maize (Zea mays), illustrative — one archetype for both seasons (maize1 / maize2 share it; a season is not a species).
// Silhouette: jointed stalk + long arched leaves leaving the stalk alternately + a branched TERMINAL tassel +
// a LATERAL ear, wrapped in husk, with silks at its tip (research-botany.md §6). The ear is never at the top and is
// never shown husked. Grain filling enlarges the ear, not the whole plant; drying goes organ by organ.
import { mulberry32 } from '../scene-math';
import type { AnnualPose } from '../visual-state';
import { LEAF, MAIZE, STEM } from './colors';
import { add, blade, blob, clamp01, dir, lerp, mixHex, mul, ramp, tube, type Detail, type PlantPlan, type V3 } from './plan';

export const MAIZE_HEIGHT_M = 2.2;
const LEAVES: Record<Detail, number> = { detail: 13, field: 9, far: 6 };
/** Share of the stalk height where the ear leaves the stalk. */
export const EAR_AT = 0.5;

export function maizePlan(pose: AnnualPose, variant: number, detail: Detail): PlantPlan {
  const base = 2027 + variant * 7919; const r = mulberry32(base); const plan: PlantPlan = [];
  const plane = r() * Math.PI; const h = MAIZE_HEIGHT_M * pose.height * (0.95 + r() * 0.1);
  const stalkColor = mixHex(STEM.green, STEM.dry, pose.dry * 0.9); const r0 = 0.005 + 0.019 * pose.height;
  plan.push(tube('stem', [0, 0, 0], [0, h, 0], r0, r0 * 0.5, stalkColor));

  const max = LEAVES[detail]; const n = Math.max(3, Math.round(lerp(3, max, ramp(pose.leaf, 0.04, 0.9))));
  const growth = lerp(0.28, 1, ramp(pose.leaf, 0, 0.85)); const lost = Math.round(pose.drop * n * 0.3);
  let earYaw = plane;
  for (let i = 0; i < n; i++) {
    const rn = mulberry32(base + 53 * (i + 1)); const jitter = rn(), bend = rn();
    const u = (i + 0.6) / n; const y = h * (0.05 + 0.9 * u); const yaw = plane + (i % 2 ? Math.PI : 0) + (jitter - 0.5) * 0.5;
    if (Math.abs(u - EAR_AT) < 0.5 / n) earYaw = yaw;
    if (i < lost) continue; // the lowest leaves are the first to go
    // The youngest leaves stand upright in the whorl until the tassel is out.
    const young = i >= n - 2 && pose.bloom < 0.5;
    const length = (0.42 + 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.05))) * growth * (young ? 0.72 : 1);
    const width = Math.min(0.095, length * 0.1 + 0.012) * (detail === 'detail' ? 1 : detail === 'field' ? 1.15 : 1.4);
    const s = clamp01(pose.senescence * 1.7 - u * 0.7);
    const color = s < 0.5 ? mixHex(u > 0.8 ? LEAF.light : LEAF.mid, LEAF.yellow, s * 2) : mixHex(LEAF.yellow, LEAF.straw, (s - 0.5) * 2);
    const tip = mixHex(color, LEAF.straw, clamp01(pose.senescence * 1.4));
    plan.push(blade('leaf', [0, y, 0], yaw, young ? 1.25 : lerp(1.05, 0.8, u), length, width, (young ? 0.5 : 1.45 + bend * 0.5) + s * 0.8, 0.28, 'strap', color, tip));
  }

  // Terminal tassel: a thin central axis with slender side branches — never a ball and never an ear.
  if (pose.bloom > 0) {
    const tassel = mixHex(MAIZE.tassel, MAIZE.tasselDry, pose.dry); const top: V3 = [0, h, 0]; const rise = 0.3 * pose.bloom;
    plan.push(tube('tassel', top, [0, h + rise, 0], 0.006, 0.003, tassel));
    const count = detail === 'detail' ? 9 : detail === 'field' ? 5 : 3;
    for (let k = 0; k < count; k++) {
      const from: V3 = [0, h + 0.03 + (k / count) * rise * 0.6, 0]; const yaw = plane + k * 2.399; const pitch = 0.95 - k * 0.03; const length = (0.21 - k * 0.008) * pose.bloom;
      if (detail === 'detail') {
        const to = add(from, mul(dir(yaw, pitch), length)); plan.push(tube('tassel', from, to, 0.0035, 0.002, tassel));
        for (let j = 1; j <= 5; j++) plan.push(blob('tassel', add(from, mul(dir(yaw, pitch), (length * j) / 5.4)), [0.005, 0.011, 0.005], tassel, dir(yaw, pitch)));
      } else plan.push(blade('tassel', from, yaw, pitch, length, 0.022, 0.35, 0, 'lance', tassel));
    }
  }

  // Lateral ear in a leaf axil at mid height, wrapped in husk; silks at the tip. It grows with grain filling
  // and hangs when dry.
  const present = ramp(pose.bloom, 0.4, 1);
  if (present > 0) {
    const size = present * lerp(0.45, 1, pose.fill); const y = h * (0.05 + 0.9 * EAR_AT); const yaw = earYaw + 0.6;
    const tilt = lerp(0.6, 1.75, ramp(pose.dry, 0.45, 1)); const axis: V3 = [Math.sin(yaw) * Math.sin(tilt), Math.cos(tilt), Math.cos(yaw) * Math.sin(tilt)];
    const length = 0.26 * size, radius = 0.042 * size; const husk = mixHex(MAIZE.husk, MAIZE.huskDry, pose.dry);
    // A short shank holds the ear away from the stalk, so it reads as a separate lateral organ.
    const node: V3 = [0, y, 0]; const foot = add(node, mul(dir(yaw, 0.5), r0 + 0.035 * size)); const end = add(foot, mul(axis, length));
    plan.push(tube('husk', node, foot, 0.012 * size, 0.014 * size, husk));
    plan.push(blob('ear', add(foot, mul(axis, length * 0.5)), [radius, length * 0.52, radius], husk, axis));
    if (detail === 'detail') for (const side of [-1, 1]) plan.push(blade('husk', add(foot, mul(axis, length * 0.55)), yaw + side * 0.5, Math.PI / 2 - tilt, length * 0.55, radius * 1.3, 0.25, 0.3, 'lance', mixHex(husk, LEAF.light, 0.3)));
    const silk = mixHex(MAIZE.silk, MAIZE.silkDry, ramp(pose.fill, 0.3, 1));
    if (detail === 'detail') for (let k = 0; k < 7; k++) { const a = yaw + (k - 3) * 0.32; plan.push(tube('silk', end, add(end, add(mul(axis, 0.035 * size + 0.01), mul(dir(a, -0.4), 0.05 * size + 0.012))), 0.0026, 0.0014, silk)); }
    else if (detail === 'field') plan.push(blob('silk', add(end, mul(axis, 0.012)), [0.014 * size + 0.004, 0.022 * size + 0.006, 0.014 * size + 0.004], silk, axis));
  }
  return plan;
}
