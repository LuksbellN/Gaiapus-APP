// Coffee (Coffea arabica / Coffea canephora "conilon"), illustrative perennials (research-botany.md §10).
// Two independent dimensions, never one "development" scalar:
//   - age / training: a small young plant at implantation (`seedling`) or the persistent woody frame of an adult;
//   - fruit cycle (adult only): flowers and fruits are ADDED TO or REMOVED FROM the nodes of the side branches.
// The adult frame — upright (orthotropic) stems, side (plagiotropic) branches in opposite pairs, opposite leaf pairs at
// the branch nodes — is built first and does not read the fruit phase at all, so trunk, branches and leaves are the same
// primitives in every phase: ripening colours the fruits, never the canopy, and harvest leaves the whole bush standing.
// `COFFEE_PROFILE` is a TRAINING profile, not a species classifier: one stem with a roughly conical canopy for the
// arabica demonstration, several stems (configurable, `opts.stems`) with a more open canopy and somewhat larger leaves
// for the conilon demonstration. Both use the same leaf and fruit colours. Age, cultivar/clone and pruning are not in
// the contract; ripe fruits are drawn red here as a declared choice (yellow-fruited cultivars exist).
import { mulberry32 } from '../scene-math';
import type { CoffeeFruit, CoffeePose } from '../visual-state';
import { COFFEE, FLOWER, STEM } from './colors';
import { add, blade, blob, dir, lerp, mixHex, mul, tube, type Detail, type PlantPlan, type V3 } from './plan';

export type CoffeeSpecies = 'coffee_arabica' | 'coffee_conilon';
export const COFFEE_PROFILE = { coffee_arabica: { stems: 1 }, coffee_conilon: { stems: 4 } } as const;
/** Nominal adult height, the same for both: no absolute size difference between the species is claimed. */
export const COFFEE_HEIGHT_M = 1.95;
export const COFFEE_SEEDLING_HEIGHT_M = 0.42;
/** `opts.stems` is clamped to this range so the geometry budget holds. */
export const COFFEE_MAX_STEMS = 6;

type Shape = {
  /** Branch levels shared by all the stems of a plant (each level is one opposite pair). */
  levels: Record<Detail, number>;
  /** Leaf nodes on a branch, lowest and highest level. */
  nodes: Record<Detail, readonly [number, number]>;
  /** Share of the stem below the first branches. */
  first: number;
  /** Length of the lowest branches (m) and how much of it the top branches keep: this is the canopy outline. */
  reach: number; taper: number;
  /** Pitch of the lowest branches (rad). */
  low: number;
  /** Leaf length and width (m). Drawn somewhat larger than a real leaf: few leaves must read as a closed canopy. */
  leaf: readonly [number, number];
};
const SHAPE: Record<CoffeeSpecies, Shape> = {
  coffee_arabica: { levels: { detail: 10, field: 10, far: 6 }, nodes: { detail: [5, 3], field: [5, 3], far: [3, 2] }, first: 0.15, reach: 0.78, taper: 0.28, low: -0.1, leaf: [0.19, 0.084] },
  coffee_conilon: { levels: { detail: 20, field: 20, far: 8 }, nodes: { detail: [2, 2], field: [2, 2], far: [2, 2] }, first: 0.3, reach: 0.6, taper: 0.55, low: 0.05, leaf: [0.22, 0.1] },
};
/** Mature leaf shades (dark, glossy-looking green) shared by both species. */
const SHADES = [COFFEE.leaf, mixHex(COFFEE.leaf, COFFEE.leafNew, 0.22), mixHex(COFFEE.leaf, '#17401F', 0.4)] as const;
const FLUSH = mixHex(COFFEE.leafNew, COFFEE.leaf, 0.3);
const TURNING = mixHex(COFFEE.yellow, COFFEE.ripe, 0.4);
const PAIR_TURN = Math.PI * 0.618;
const seedOf = (species: CoffeeSpecies, variant: number) => 7069 + (species === 'coffee_conilon' ? 3331 : 0) + variant * 7919;

/** A branch node where flowers and fruits may sit, and the side of the branch (`hand`) they are drawn on. */
type Site = { at: V3; along: V3; side: V3; hand: number; seed: number };

/** The persistent frame of an adult plant and its fruiting sites. It knows nothing about the fruit phase. */
function frame(species: CoffeeSpecies, variant: number, detail: Detail, stems: number): { plan: PlantPlan; sites: Site[] } {
  const shape = SHAPE[species]; const base = seedOf(species, variant); const r = mulberry32(base); const plan: PlantPlan = []; const sites: Site[] = [];
  const twist = r() * Math.PI * 2; const height = COFFEE_HEIGHT_M * (0.96 + r() * 0.08);
  // The branch budget is shared: more stems means fewer levels on each one, so the triangle count stays bounded.
  const levels = Math.max(1, Math.floor(shape.levels[detail] / stems)); const [low, high] = shape.nodes[detail];
  const leafScale = detail === 'far' ? 1.3 : 1; const girth = Math.min(0.035, 0.048 / Math.sqrt(stems));
  for (let s = 0; s < stems; s++) {
    const rs = mulberry32(base + 1009 * (s + 1)); const sa = rs(), sb = rs(), sc = rs(), sd = rs();
    // One stem stands upright; several stems share the base and lean apart like an open vase.
    const syaw = twist + (s / stems) * Math.PI * 2 + (sa - 0.5) * 0.5; const lean = stems === 1 ? sb * 0.04 : 0.18 + sb * 0.12;
    const axis = dir(syaw, Math.PI / 2 - lean); const foot: V3 = stems === 1 ? [0, 0, 0] : mul(dir(syaw, 0), 0.035);
    const length = (height * (stems === 1 ? 1 : 0.95 + sc * 0.07)) / Math.cos(lean); const top = add(foot, mul(axis, length));
    plan.push(tube('trunk', foot, top, girth, girth * 0.3, STEM.wood));
    for (let l = 0; l < levels; l++) {
      const rp = mulberry32(base + 1009 * (s + 1) + 31 * (l + 1)); const turn = rp();
      // A single stem is filled from the first branches to the top; several stems carry their pairs at staggered
      // heights so the plant does not read as stacked floors.
      const u = stems > 1 ? (l + 0.3 + 0.65 * sd) / levels : levels === 1 ? 0.5 : l / (levels - 1);
      const p = add(foot, mul(axis, length * lerp(shape.first, 0.94, u)));
      const nodes = Math.max(1, Math.round(lerp(low, high, u)));
      // Opposite pair. Coffee is decussate (successive pairs a quarter turn apart); here each pair is turned by the
      // golden section of a half turn (about 111 degrees) instead, an artistic choice: with a quarter turn the few pairs
      // that the budget allows would all lie in two planes and the canopy would read as a cross from above.
      for (const half of [0, 1]) {
        const ba = rp(), bb = rp(), bc = rp();
        const byaw = syaw + 0.4 + l * PAIR_TURN + (turn - 0.5) * 0.3 + half * Math.PI;
        // Low branches are long and nearly horizontal, the upper ones short and ascending.
        const d = dir(byaw, lerp(shape.low, 0.6, Math.pow(u, 1.4)) + (ba - 0.5) * 0.16);
        const reach = shape.reach * (0.9 + 0.2 * bb) * lerp(1, shape.taper, Math.pow(u, 0.9));
        plan.push(tube('branch', p, add(p, mul(d, reach)), lerp(0.009, 0.005, u), lerp(0.004, 0.0025, u), mixHex(STEM.woodPale, STEM.green, 0.3 + 0.45 * u)));
        const side: V3 = [Math.cos(byaw), 0, -Math.sin(byaw)]; const start = bc < 0.5 ? 1 : -1;
        for (let j = 0; j < nodes; j++) {
          const node = add(p, mul(d, (reach * (j + 1)) / nodes)); const last = j === nodes - 1;
          // Opposite leaves on both sides of the branch, hanging a little; the pair at the tip is the young flush.
          for (const hand of [1, -1]) {
            const la = rp(), lb = rp(), lc = rp(); const size = (0.84 + 0.3 * la) * (last ? 0.8 : 1) * leafScale;
            plan.push(blade('leaf', node, byaw + hand * (last ? 0.75 : 1.25), 0.05 + 0.25 * lb, shape.leaf[0] * size, shape.leaf[1] * size, 0.7 + 0.4 * lc, 0.2, 'elliptic', last ? FLUSH : SHADES[Math.floor(lc * 2.999)]));
          }
          // Flowers and fruits belong to the older nodes, never to the tip flush.
          if (!last) sites.push({ at: node, along: d, side, hand: j % 2 ? start : -start, seed: base + 50021 + 13 * sites.length });
        }
      }
    }
    if (detail !== 'far') for (const hand of [1, -1]) plan.push(blade('leaf', top, syaw + hand * (Math.PI / 2), 0.75, shape.leaf[0] * 0.7, shape.leaf[1] * 0.7, 0.5, 0.2, 'elliptic', COFFEE.leafNew));
  }
  return { plan, sites };
}

/** Flowers or fruits at the fruiting nodes, alternating sides along a branch. One blob stands for the small cluster of a node. */
function bear(plan: PlantPlan, sites: readonly Site[], phase: Exclude<CoffeeFruit, 'none' | 'harvested'>, detail: Detail) {
  // A single 17 mm fruit is small next to a two-metre bush and invisible from the field: the blob is drawn a little
  // larger than one fruit and, from further away, at the size of the cluster of the whole node.
  const scale = detail === 'detail' ? 1.7 : detail === 'field' ? 2 : 2.3;
  for (const site of sites) {
    const rn = mulberry32(site.seed); const size = 0.9 + rn() * 0.2, turn = rn();
    if (phase === 'flowering') {
      const w = 0.012 * scale * size;
      plan.push(blob('flower', add(add(site.at, mul(site.side, site.hand * w * 0.5)), [0, 0.007, 0]), [w, w * 0.6, w], FLOWER.coffee));
    } else {
      const radius = (phase === 'green' ? 0.0065 : 0.0085) * scale * size;
      // Ripening is not synchronous: most fruits are ripe, some are still turning and a few are green.
      const color = phase === 'green' ? COFFEE.green : turn < 0.13 ? COFFEE.green : turn < 0.35 ? TURNING : COFFEE.ripe;
      plan.push(blob('fruit', add(add(site.at, mul(site.side, site.hand * (0.004 + radius))), [0, 0.004, 0]), [radius, radius * 1.15, radius], color, site.along));
    }
  }
}

/** Young plant at implantation: one thin stem with a few opposite leaf pairs. Never flowers or fruits. */
function seedling(species: CoffeeSpecies, variant: number, detail: Detail): PlantPlan {
  const shape = SHAPE[species]; const base = seedOf(species, variant) + 9091; const r = mulberry32(base); const plan: PlantPlan = [];
  const twist = r() * Math.PI * 2; const height = COFFEE_SEEDLING_HEIGHT_M * (0.9 + r() * 0.2); const axis = dir(twist, Math.PI / 2 - r() * 0.06);
  plan.push(tube('trunk', [0, 0, 0], mul(axis, height), 0.006, 0.003, mixHex(STEM.green, STEM.wood, 0.45)));
  const pairs = detail === 'detail' ? 5 : detail === 'field' ? 4 : 3;
  for (let i = 0; i < pairs; i++) {
    const rn = mulberry32(base + 29 * (i + 1)); const a = rn(), b = rn(), c = rn();
    const u = i / (pairs - 1); const at = mul(axis, height * lerp(0.32, 1, u)); const yaw = twist + i * (Math.PI / 2) + (a - 0.5) * 0.4;
    const size = lerp(0.72, 0.42, u) * (0.92 + 0.16 * b);
    for (const hand of [0, Math.PI]) plan.push(blade('leaf', at, yaw + hand, 0.25 + 0.35 * u, shape.leaf[0] * size, shape.leaf[1] * size, 0.5, 0.2, 'elliptic', i === pairs - 1 ? COFFEE.leafNew : SHADES[Math.floor(c * 2.999)]));
  }
  return plan;
}

export function coffeePlan(species: CoffeeSpecies, pose: CoffeePose, variant: number, detail: Detail, opts: { stems?: number } = {}): PlantPlan {
  if (pose.age === 'seedling') return seedling(species, variant, detail);
  const wanted = opts.stems ?? COFFEE_PROFILE[species].stems;
  const stems = Number.isFinite(wanted) ? Math.max(1, Math.min(COFFEE_MAX_STEMS, Math.round(wanted))) : COFFEE_PROFILE[species].stems;
  const { plan, sites } = frame(species, variant, detail, stems);
  if (pose.fruit === 'flowering' || pose.fruit === 'green' || pose.fruit === 'ripe') bear(plan, sites, pose.fruit, detail);
  return plan;
}
