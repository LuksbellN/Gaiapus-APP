// Regression tests for the demonstration archetypes: bean, rice, wheat and the two coffees.
// They assert botanical identity (which organs exist, where, and how they are organised), not exact coordinates.
import { describe, expect, it } from 'vitest';
import { annualPose, type AnnualPose, type CoffeeFruit, type CoffeePose } from '../visual-state';
import { BEAN_HEIGHT_M, beanPlan } from './bean';
import { COFFEE_PROFILE, coffeePlan, type CoffeeSpecies } from './coffee';
import { meshPlan, triangles } from './mesh';
import { REPRODUCTIVE, add, bladeRows, bounds, count, len, mul, sub, unit, type Blade, type Blob, type Detail, type Organ, type PlantPlan, type Pod, type Prim, type Tube, type V3 } from './plan';
import { RICE_HEIGHT_M, RICE_PANICLE_M, ricePlan } from './rice';
import { SOY_HEIGHT_M, soyPlan } from './soy';
import { WHEAT_HEIGHT_M, WHEAT_PROFILE, WHEAT_SPIKE_M, wheatPlan } from './wheat';

const DETAILS: readonly Detail[] = ['detail', 'field', 'far'];
const VARIANTS = [0, 1, 2, 3, 4];
const ANNUALS = { bean: beanPlan, rice: ricePlan, wheat: wheatPlan } as const;
type Annual = keyof typeof ANNUALS;
const NAMES = Object.keys(ANNUALS) as Annual[];
const ORGANS: Record<Annual, readonly Organ[]> = {
  bean: ['stem', 'petiole', 'leaflet', 'leaf', 'cotyledon', 'branch', 'flower', 'pod'],
  rice: ['tiller', 'leaf', 'panicle', 'grain'],
  wheat: ['tiller', 'leaf', 'spike', 'awn'],
};
const BUDGET: Record<Detail, number> = { detail: 4000, field: 900, far: 300 };
const COFFEE_BUDGET: Record<Detail, number> = { detail: 6000, field: 1500, far: 500 };

const HEADING = annualPose('reproductive', 0.3); // inflorescence out, no grain filling yet
const FILLED = annualPose('reproductive', 0.9);
const RIPENING = annualPose('maturation', 0.3);
const RIPE = annualPose('maturation', 1);
const BEFORE_BLOOM: readonly AnnualPose[] = [annualPose('establishment', 0), annualPose('establishment', 0.5), annualPose('establishment', 1), annualPose('vegetative', 0), annualPose('vegetative', 0.5), annualPose('vegetative', 1)];
const TIMELINE: readonly AnnualPose[] = [...BEFORE_BLOOM, annualPose('reproductive', 0.05), annualPose('reproductive', 0.2), HEADING, annualPose('reproductive', 0.6), FILLED, annualPose('maturation', 0), RIPENING, annualPose('maturation', 0.7), RIPE];

const SPECIES: readonly CoffeeSpecies[] = ['coffee_arabica', 'coffee_conilon'];
const PHASES: readonly CoffeeFruit[] = ['none', 'flowering', 'green', 'ripe', 'harvested'];
const adult = (fruit: CoffeeFruit): CoffeePose => ({ age: 'adult', fruit });
const seedling = (fruit: CoffeeFruit): CoffeePose => ({ age: 'seedling', fruit });

const tris = (plan: PlantPlan, detail: Detail) => triangles(meshPlan(plan, detail));
const of = (plan: PlantPlan, ...organs: Organ[]) => plan.filter((p) => organs.includes(p.organ));
const isTube = (p: Prim): p is Tube => p.kind === 'tube';
const isBlade = (p: Prim): p is Blade => p.kind === 'blade';
const isBlob = (p: Prim): p is Blob => p.kind === 'blob';
const isPod = (p: Prim): p is Pod => p.kind === 'pod';
const organSet = (plan: PlantPlan) => new Set(plan.map((p) => p.organ));
const top = (plan: PlantPlan, organs?: readonly Organ[]) => bounds(plan, organs)?.max[1] ?? 0;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** Positive for a green surface, negative for a red or straw-brown one. */
const greenness = (hex: string) => { const [r, g] = channels(hex); return g - r; };
const key = (p: V3) => p.map((v) => v.toFixed(5)).join(',');
/** Distance from a point to the infinite line through a tube. */
const lineDistance = (q: V3, t: Tube) => { const axis = unit(sub(t.to, t.from)); const v = sub(q, t.from); return len(sub(v, mul(axis, v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2]))); };
const groupSizes = (points: V3[]) => { const groups = new Map<string, number>(); for (const p of points) groups.set(key(p), (groups.get(key(p)) ?? 0) + 1); return [...groups.values()]; };

/** Representative points of a primitive (centre line for blades). */
const samples = (p: Prim): V3[] => p.kind === 'tube' ? [p.from, p.to] : p.kind === 'blob' ? [p.at] : p.kind === 'pod' ? [p.at, add(p.at, mul(unit(p.dir), p.length))] : bladeRows(p, 'field').map((row) => row.m);
/**
 * How far the given organs stray from the straight line of the nearest culm (extended beyond its tip), in metres.
 * A terminal, compact inflorescence stays on that line; a branched, nodding one leaves it.
 */
function offAxis(plan: PlantPlan, ...organs: Organ[]): number {
  const culms = of(plan, 'tiller').filter(isTube); let worst = 0;
  for (const prim of of(plan, ...organs)) for (const q of samples(prim)) {
    let nearest = Infinity;
    for (const culm of culms) nearest = Math.min(nearest, lineDistance(q, culm));
    worst = Math.max(worst, nearest);
  }
  return worst;
}
/** Mean greenness of the lower and of the upper half of the leaves, by attachment height. */
function leafGreenness(plan: PlantPlan, ...organs: Organ[]) {
  const leaves = of(plan, ...organs).filter(isBlade).sort((a, b) => a.at[1] - b.at[1]); const half = Math.floor(leaves.length / 2);
  return { lower: mean(leaves.slice(0, half).map((l) => greenness(l.color))), upper: mean(leaves.slice(leaves.length - half).map((l) => greenness(l.color))), shades: new Set(leaves.map((l) => l.color)).size };
}

describe('annual archetypes: shared rules', () => {
  it.each(NAMES)('%s is deterministic and a variant is a different plant of the same kind', (name) => {
    const build = ANNUALS[name];
    for (const detail of DETAILS) for (const pose of [annualPose('vegetative', 0.6), FILLED, RIPENING]) {
      expect(build(pose, 3, detail)).toEqual(build(pose, 3, detail));
      const a = build(pose, 0, detail), b = build(pose, 1, detail);
      expect(b).not.toEqual(a);
      expect(organSet(b)).toEqual(organSet(a));
      expect(Math.abs(b.length - a.length)).toBeLessThanOrEqual(a.length * 0.4);
      expect(Math.abs(top(b) - top(a))).toBeLessThan(top(a) * 0.3);
    }
  });

  it.each(NAMES)('%s uses only its own organs at every stage', (name) => {
    for (const detail of DETAILS) for (const variant of VARIANTS) for (const pose of TIMELINE)
      for (const prim of ANNUALS[name](pose, variant, detail)) expect(ORGANS[name]).toContain(prim.organ);
  });

  it.each(NAMES)('%s shows no reproductive organ before the reproductive stage', (name) => {
    for (const detail of DETAILS) for (const variant of VARIANTS) for (const pose of BEFORE_BLOOM)
      expect(count(ANNUALS[name](pose, variant, detail), ...REPRODUCTIVE)).toBe(0);
    // The reproductive organs do exist later on.
    for (const detail of DETAILS) expect(count(ANNUALS[name](FILLED, 0, detail), ...REPRODUCTIVE)).toBeGreaterThan(0);
  });

  it.each(NAMES)('%s grows from a seedling to about its nominal height and stays above the soil', (name) => {
    const nominal = { bean: BEAN_HEIGHT_M, rice: RICE_HEIGHT_M, wheat: WHEAT_HEIGHT_M }[name];
    for (const variant of VARIANTS) {
      const small = top(ANNUALS[name](annualPose('establishment', 0.5), variant, 'detail')), full = top(ANNUALS[name](FILLED, variant, 'detail'));
      expect(small).toBeLessThan(full * 0.35);
      expect(full).toBeGreaterThan(nominal * 0.75);
      expect(full).toBeLessThan(nominal * 1.25);
      for (const pose of TIMELINE) expect(bounds(ANNUALS[name](pose, variant, 'detail'))?.min[1] ?? 0).toBeGreaterThanOrEqual(-0.02);
    }
  });

  it.each(NAMES)('%s keeps a plant recognisable as itself while it grows (organs are added, not reshuffled)', (name) => {
    // The first culm / the main stem keeps its direction from one vegetative pose to the next.
    const axisOf = (pose: AnnualPose) => { const stem = ANNUALS[name](pose, 2, 'detail').filter(isTube)[0]; return unit(sub(stem.to, stem.from)); };
    const early = axisOf(annualPose('vegetative', 0.3)), late = axisOf(annualPose('vegetative', 0.9));
    expect(len(sub(early, late))).toBeLessThan(1e-9);
    expect(ANNUALS[name](annualPose('vegetative', 0.9), 2, 'detail').length).toBeGreaterThan(ANNUALS[name](annualPose('vegetative', 0.3), 2, 'detail').length);
  });

  it.each(NAMES)('%s loses its green gradually, lower leaves first', (name) => {
    const leafOrgans: Organ[] = name === 'bean' ? ['leaflet'] : ['leaf'];
    for (const variant of VARIANTS) {
      const fresh = leafGreenness(ANNUALS[name](FILLED, variant, 'detail'), ...leafOrgans), turning = leafGreenness(ANNUALS[name](RIPENING, variant, 'detail'), ...leafOrgans);
      expect(fresh.lower).toBeGreaterThan(0);
      expect(turning.shades).toBeGreaterThan(2); // not one uniform colour swap
      expect(turning.lower).toBeLessThan(turning.upper);
      expect(turning.upper).toBeLessThan(fresh.upper + 1e-9);
    }
  });

  it.each(NAMES)('%s stays inside the triangle budget', (name) => {
    for (const detail of DETAILS) for (const variant of VARIANTS) for (const pose of [annualPose('reproductive', 0.15), HEADING, annualPose('reproductive', 0.6), FILLED, annualPose('maturation', 0), RIPENING])
      expect(tris(ANNUALS[name](pose, variant, detail), detail)).toBeLessThanOrEqual(BUDGET[detail]);
  });
});

describe('bean: open bush with long pendant pods', () => {
  it('goes cotyledons → primary leaves → trifoliolates → flowers → pods', () => {
    const emergence = beanPlan(annualPose('establishment', 0), 0, 'detail');
    expect(count(emergence, 'cotyledon')).toBe(2);
    expect(count(emergence, 'leaf', 'leaflet')).toBe(0);
    const primary = beanPlan(annualPose('establishment', 0.5), 0, 'detail');
    expect(count(primary, 'cotyledon')).toBe(2);
    expect(count(primary, 'leaf')).toBe(2); // the opposite pair of simple leaves
    expect(count(primary, 'leaflet')).toBe(0);
    const vegetative = beanPlan(annualPose('vegetative', 0.7), 0, 'detail');
    expect(count(vegetative, 'cotyledon', 'leaf')).toBe(0);
    expect(count(vegetative, 'leaflet') % 3).toBe(0);
    expect(count(vegetative, 'leaflet')).toBeGreaterThanOrEqual(9);
    expect(count(vegetative, 'branch')).toBeGreaterThan(0);
    const flowering = beanPlan(annualPose('reproductive', 0.2), 0, 'detail');
    expect(count(flowering, 'flower')).toBeGreaterThan(0);
    expect(count(flowering, 'pod')).toBe(0);
    const pods = beanPlan(FILLED, 0, 'detail');
    expect(count(pods, 'pod')).toBeGreaterThan(0);
    expect(count(pods, 'flower')).toBe(0);
  });

  it('opens buds into flowers and keeps flowers out of the far view', () => {
    const bud = beanPlan({ ...annualPose('reproductive', 0.2), flower: 0.1 }, 0, 'detail').filter(isBlob).filter((p) => p.organ === 'flower');
    const open = beanPlan({ ...annualPose('reproductive', 0.2), flower: 1 }, 0, 'detail').filter(isBlob).filter((p) => p.organ === 'flower');
    expect(open.length).toBe(bud.length);
    expect(open[0].radii[1]).toBeGreaterThan(bud[0].radii[1]);
    expect(open[0].color).not.toBe(bud[0].color);
    expect(count(beanPlan(annualPose('reproductive', 0.2), 0, 'far'), 'flower')).toBe(0);
  });

  it('has a more open canopy than soybean: fewer leaflets, longer petioles, wider leaflets', () => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const pose = annualPose('reproductive', 0.3); const bean = beanPlan(pose, variant, detail), soy = soyPlan(pose, variant, detail);
      expect(count(bean, 'leaflet')).toBeLessThan(count(soy, 'leaflet'));
      const ratio = (plan: PlantPlan) => mean(of(plan, 'leaflet').filter(isBlade).map((l) => l.width / l.length));
      expect(ratio(bean)).toBeGreaterThan(ratio(soy) * 1.08);
      if (detail === 'far') continue; // petioles are not drawn from far away
      const petiole = (plan: PlantPlan, height: number) => mean(of(plan, 'petiole').filter(isTube).map((t) => len(sub(t.to, t.from)))) / height;
      expect(petiole(bean, BEAN_HEIGHT_M)).toBeGreaterThan(petiole(soy, SOY_HEIGHT_M) * 1.5);
    }
  });

  it('carries long, narrow, pendant pods: longer than soybean pods and fewer per node', () => {
    const perNode = (plan: PlantPlan) => { const groups = new Map<string, number>(); for (const p of of(plan, 'pod').filter(isPod)) groups.set(p.at[1].toFixed(5), (groups.get(p.at[1].toFixed(5)) ?? 0) + 1); return [...groups.values()]; };
    const beanNodes: number[] = [], soyNodes: number[] = [];
    for (const variant of VARIANTS) for (const pose of [annualPose('reproductive', 1), RIPENING]) {
      const bean = of(beanPlan(pose, variant, 'detail'), 'pod').filter(isPod), soy = of(soyPlan(pose, variant, 'detail'), 'pod').filter(isPod);
      expect(bean.length).toBeGreaterThan(3);
      const longestSoy = Math.max(...soy.map((p) => p.length));
      for (const p of bean) {
        expect(p.length).toBeGreaterThanOrEqual(0.1);
        expect(p.length).toBeLessThanOrEqual(0.13);
        expect(p.length).toBeGreaterThan(longestSoy * 1.8);
        expect(p.radius / p.length).toBeLessThan(0.08); // narrow
        expect(unit(p.dir)[1]).toBeLessThan(-0.7); // pendant
      }
      expect(mean(bean.map((p) => p.radius / p.length))).toBeLessThan(mean(soy.map((p) => p.radius / p.length)) * 0.6);
      expect(bounds(beanPlan(pose, variant, 'detail'), ['pod'])?.min[1] ?? -1).toBeGreaterThan(0); // never into the soil
      beanNodes.push(...perNode(beanPlan(pose, variant, 'detail'))); soyNodes.push(...perNode(soyPlan(pose, variant, 'detail')));
    }
    expect(Math.max(...beanNodes)).toBeLessThanOrEqual(2);
    expect(Math.max(...soyNodes)).toBeGreaterThanOrEqual(3);
    expect(mean(beanNodes)).toBeLessThan(mean(soyNodes));
  });

  it('lengthens the pods first, fills them later, then dries them while the canopy thins', () => {
    const pods = (pose: AnnualPose) => of(beanPlan(pose, 1, 'detail'), 'pod').filter(isPod);
    const young = pods(annualPose('reproductive', 0.55)), filled = pods(annualPose('reproductive', 1)), dry = pods(RIPE);
    expect(young.length).toBe(filled.length);
    expect(young[0].length).toBeLessThan(filled[0].length);
    expect(young[0].radius).toBeLessThan(filled[0].radius);
    for (const p of filled) expect(greenness(p.color)).toBeGreaterThan(0);
    for (const p of dry) expect(greenness(p.color)).toBeLessThan(0);
    // Pods do not all change colour on the same day.
    expect(new Set(pods(annualPose('maturation', 0.6)).map((p) => p.color)).size).toBeGreaterThan(1);
    // The pods and the stem remain when the leaves are gone.
    expect(dry.length).toBe(filled.length);
    expect(count(beanPlan(RIPE, 1, 'detail'), 'leaflet')).toBeLessThan(count(beanPlan(FILLED, 1, 'detail'), 'leaflet') * 0.4);
    expect(count(beanPlan(annualPose('maturation', 0.6), 1, 'detail'), 'leaflet')).toBeLessThan(count(beanPlan(FILLED, 1, 'detail'), 'leaflet'));
    expect(count(beanPlan(RIPE, 1, 'detail'), 'stem')).toBe(1);
  });
});

describe('rice: tussock with a branched, nodding panicle', () => {
  it('is a tussock of several thin culms with narrow leaves', () => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const plan = ricePlan(HEADING, variant, detail); const culms = of(plan, 'tiller').filter(isTube);
      expect(culms.length).toBeGreaterThanOrEqual(4);
      for (const culm of culms) expect(culm.r0).toBeLessThan(0.006);
      const leaves = of(plan, 'leaf').filter(isBlade);
      expect(leaves.length).toBeGreaterThanOrEqual(culms.length * 2);
      for (const leaf of leaves) expect(leaf.width / leaf.length).toBeLessThan(0.12);
    }
    // Tillering adds culms during the vegetative stage.
    expect(count(ricePlan(annualPose('establishment', 0.2), 0, 'detail'), 'tiller')).toBe(1);
    expect(count(ricePlan(annualPose('vegetative', 1), 0, 'detail'), 'tiller')).toBeGreaterThan(count(ricePlan(annualPose('vegetative', 0.2), 0, 'detail'), 'tiller'));
  });

  it('never contains anything but culms, leaves, panicles and grains (no water, no other organ)', () => {
    for (const detail of DETAILS) for (const pose of TIMELINE) for (const organ of organSet(ricePlan(pose, 0, detail))) expect(['tiller', 'leaf', 'panicle', 'grain']).toContain(organ);
    // Nothing lies flat on the ground like a water surface would.
    for (const detail of DETAILS) expect(bounds(ricePlan(RIPE, 0, detail))?.max[1] ?? 0).toBeGreaterThan(0.5);
  });

  it('brings the panicle out gradually: hidden, then partly out and upright, then fully out', () => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const at = (bloom: number) => ricePlan({ ...annualPose('reproductive', 0.1), bloom }, variant, detail);
      const hidden = at(0.03), partly = at(0.35), out = at(1);
      expect(count(hidden, 'panicle', 'grain')).toBe(0);
      expect(count(partly, 'panicle')).toBeGreaterThan(0);
      expect(count(partly, 'panicle')).toBeLessThan(count(out, 'panicle'));
      expect(count(partly, 'grain')).toBeLessThan(count(out, 'grain'));
      expect(top(partly, ['panicle', 'grain'])).toBeLessThan(top(out, ['panicle', 'grain']));
      // Still upright while it emerges: close to the line of its culm.
      expect(offAxis(partly, 'panicle', 'grain')).toBeLessThan(0.05);
      expect(offAxis(partly, 'panicle', 'grain')).toBeLessThan(offAxis(ricePlan(RIPENING, variant, detail), 'panicle', 'grain') * 0.5);
    }
  });

  it('nods more as the grain fills and matures, without lodging the plant', () => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const empty = ricePlan({ ...FILLED, fill: 0 }, variant, detail), heavy = ricePlan(FILLED, variant, detail), ripe = ricePlan(RIPE, variant, detail);
      expect(offAxis(heavy, 'panicle', 'grain')).toBeGreaterThan(offAxis(empty, 'panicle', 'grain') * 1.5);
      expect(top(heavy, ['panicle', 'grain'])).toBeLessThan(top(empty, ['panicle', 'grain']));
      expect(offAxis(ripe, 'panicle', 'grain')).toBeGreaterThanOrEqual(offAxis(heavy, 'panicle', 'grain'));
      // Culms keep standing and each one leans by its own amount.
      const leans = of(ripe, 'tiller').filter(isTube).map((t) => unit(sub(t.to, t.from))[1]);
      for (const up of leans) expect(up).toBeGreaterThan(0.9);
      expect(new Set(leans.map((v) => v.toFixed(4))).size).toBe(leans.length);
    }
  });

  it('turns the grains from green to gold gradually and makes them only slightly larger', () => {
    const grains = (pose: AnnualPose) => of(ricePlan(pose, 0, 'detail'), 'grain').filter(isTube);
    const heading = grains(HEADING), filled = grains(FILLED), ripe = grains(RIPE);
    expect(heading.length).toBeGreaterThan(40);
    for (const g of heading) expect(greenness(g.color)).toBeGreaterThan(0);
    for (const g of ripe) expect(greenness(g.color)).toBeLessThan(0);
    expect(new Set(grains(annualPose('reproductive', 0.75)).map((g) => g.color)).size).toBeGreaterThan(1);
    expect(filled[0].r0).toBeGreaterThan(heading[0].r0);
    for (const g of ripe) { expect(g.r0).toBeLessThan(0.004); expect(len(sub(g.to, g.from))).toBeLessThan(0.012); }
  });
});

describe('wheat: thin culms with a compact terminal spike', () => {
  it('has tillers, a flag leaf high on each culm and a spike above the leaves', () => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const plan = wheatPlan(HEADING, variant, detail); const culms = of(plan, 'tiller').filter(isTube); const leaves = of(plan, 'leaf').filter(isBlade);
      expect(culms.length).toBeGreaterThanOrEqual(4);
      for (const culm of culms) {
        expect(culm.r0).toBeLessThan(0.005);
        // The last leaf of the culm (flag leaf) is attached in its upper part, below the spike.
        const own = leaves.filter((l) => len(sub(l.at, culm.from)) <= len(sub(culm.to, culm.from)) + 1e-6 && lineDistance(l.at, culm) < 1e-6);
        expect(own.length).toBeGreaterThanOrEqual(2);
        expect(Math.max(...own.map((l) => len(sub(l.at, culm.from))))).toBeGreaterThan(len(sub(culm.to, culm.from)) * 0.6);
      }
      expect(top(plan, ['spike'])).toBeGreaterThan(top(plan, ['leaf']));
      expect(bounds(plan, ['spike'])?.min[1] ?? 0).toBeGreaterThan(Math.max(...leaves.map((l) => l.at[1])) - 1e-6);
    }
  });

  it('brings the spike out of the sheath gradually', () => {
    for (const detail of ['detail', 'field'] as const) for (const variant of VARIANTS) {
      const at = (bloom: number) => wheatPlan({ ...annualPose('reproductive', 0.1), bloom }, variant, detail);
      const hidden = at(0.03), partly = at(0.35), out = at(1);
      expect(count(hidden, 'spike', 'awn')).toBe(0);
      expect(count(partly, 'spike')).toBeGreaterThan(0);
      expect(count(partly, 'spike')).toBeLessThan(count(out, 'spike'));
      expect(top(partly, ['spike'])).toBeLessThan(top(out, ['spike']));
    }
    const far = (bloom: number) => of(wheatPlan({ ...annualPose('reproductive', 0.1), bloom }, 0, 'far'), 'spike').filter(isBlob);
    expect(far(0.03).length).toBe(0);
    expect(Math.max(...far(0.35).map((s) => s.radii[1]))).toBeLessThan(Math.max(...far(1).map((s) => s.radii[1])));
  });

  it('builds the spike as one rachis with spikelets in two alternating rows', () => {
    for (const variant of VARIANTS) {
      const plan = wheatPlan(FILLED, variant, 'detail'); const rachises = of(plan, 'spike').filter(isTube); const spikelets = of(plan, 'spike').filter(isBlob);
      expect(rachises.length).toBeGreaterThanOrEqual(3);
      expect(rachises.length).toBeLessThanOrEqual(count(plan, 'tiller')); // one unbranched axis per culm, never more
      expect(spikelets.length).toBeGreaterThanOrEqual(rachises.length * 8);
      for (const rachis of rachises) {
        const axis = unit(sub(rachis.to, rachis.from)); const length = len(sub(rachis.to, rachis.from));
        const own = spikelets.map((s) => { const v = sub(s.at, rachis.from); const t = v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2]; return { t, off: sub(v, mul(axis, t)) }; }).filter((s) => len(s.off) < 0.008 && s.t > -0.01 && s.t < length + 0.01).sort((a, b) => a.t - b.t);
        expect(own.length).toBeGreaterThanOrEqual(8);
        // Lateral spikelets alternate sides along the rachis (the last one is the terminal spikelet, on the axis).
        const lateral = own.filter((s) => len(s.off) > 0.002);
        for (let i = 1; i < lateral.length; i++) expect(lateral[i].off[0] * lateral[i - 1].off[0] + lateral[i].off[1] * lateral[i - 1].off[1] + lateral[i].off[2] * lateral[i - 1].off[2]).toBeLessThan(0);
        expect(own.length - lateral.length).toBe(1);
      }
    }
  });

  it('never turns grains into large external fruits', () => {
    for (const detail of DETAILS) for (const pose of [HEADING, FILLED, RIPE]) for (const spikelet of of(wheatPlan(pose, 0, detail), 'spike').filter(isBlob)) {
      expect(Math.max(spikelet.radii[0], spikelet.radii[2])).toBeLessThan(0.012);
      if (detail !== 'far') expect(spikelet.radii[1]).toBeLessThan(0.015);
    }
    expect(count(wheatPlan(RIPE, 0, 'detail'), 'grain', 'fruit', 'pod')).toBe(0);
  });

  it('treats awns as an option of the demonstration profile', () => {
    expect(WHEAT_PROFILE.awns).toBe(true);
    for (const detail of ['detail', 'field'] as const) {
      const awned = wheatPlan(FILLED, 0, detail), plain = wheatPlan(FILLED, 0, detail, { awns: false });
      expect(count(awned, 'awn')).toBeGreaterThan(0);
      expect(count(plain, 'awn')).toBe(0);
      expect(plain).toEqual(awned.filter((p) => p.organ !== 'awn')); // nothing else changes
      expect(wheatPlan(FILLED, 0, detail, { awns: true })).toEqual(awned);
    }
    // Awns are too thin for the far view either way.
    expect(count(wheatPlan(FILLED, 0, 'far'), 'awn')).toBe(0);
  });

  it('turns leaves, culms and spikes to straw gradually', () => {
    const colours = (pose: AnnualPose, organ: Organ) => of(wheatPlan(pose, 0, 'detail'), organ).filter((p) => organ !== 'spike' || isBlob(p)).map((p) => greenness(p.color));
    for (const organ of ['tiller', 'spike', 'leaf'] as const) {
      const green = mean(colours(FILLED, organ)), mid = mean(colours(annualPose('maturation', 0.5), organ)), straw = mean(colours(RIPE, organ));
      expect(green).toBeGreaterThan(0);
      expect(mid).toBeLessThan(green);
      expect(straw).toBeLessThan(0);
      // Still changing between the middle and the end of maturation (gold and straw are both "not green").
      expect(of(wheatPlan(RIPE, 0, 'detail'), organ).map((p) => p.color)).not.toEqual(of(wheatPlan(annualPose('maturation', 0.5), 0, 'detail'), organ).map((p) => p.color));
    }
    // Midway, leaves are further along than the culms: the organs do not swap colour together.
    expect(new Set(of(wheatPlan(annualPose('maturation', 0.4), 0, 'detail'), 'leaf', 'tiller', 'spike').map((p) => p.color)).size).toBeGreaterThan(6);
  });
});

describe('rice vs wheat: branched panicle against compact spike', () => {
  it.each(DETAILS)('keeps the two inflorescences distinguishable at "%s"', (detail) => {
    for (const variant of VARIANTS) for (const pose of [HEADING, FILLED, RIPENING, RIPE]) {
      const rice = ricePlan(pose, variant, detail), wheat = wheatPlan(pose, variant, detail);
      // Sideways spread relative to the length of the inflorescence: the spike hugs the line of its culm (terminal,
      // compact); the panicle leaves it through its branches and its nodding.
      const spikeSpread = offAxis(wheat, 'spike') / WHEAT_SPIKE_M, panicleSpread = offAxis(rice, 'panicle', 'grain') / RICE_PANICLE_M;
      expect(spikeSpread).toBeLessThan(0.12);
      expect(panicleSpread).toBeGreaterThan(0.2);
      expect(panicleSpread).toBeGreaterThan(spikeSpread * 3);
      // Several lateral branches per culm in rice; wheat has no branch organ at all.
      expect(count(rice, 'panicle')).toBeGreaterThanOrEqual(count(rice, 'tiller') * (detail === 'far' ? 2 : 3));
      expect(count(rice, 'grain')).toBeGreaterThanOrEqual(count(rice, 'tiller') * 2);
      expect(count(wheat, 'panicle', 'grain')).toBe(0);
      expect(count(rice, 'spike', 'awn')).toBe(0);
    }
  });

  it('gives each rice panicle an axis with several branches that carry the grains', () => {
    for (const variant of VARIANTS) {
      const plan = ricePlan(FILLED, variant, 'detail'); const tubes = of(plan, 'panicle').filter(isTube); const grains = of(plan, 'grain').filter(isTube);
      // Every grain sits on a part of a panicle.
      for (const grain of grains) {
        const nearest = Math.min(...tubes.map((t) => { const axis = unit(sub(t.to, t.from)); const v = sub(grain.from, t.from); const along = Math.max(0, Math.min(len(sub(t.to, t.from)), v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2])); return len(sub(v, mul(axis, along))); }));
        expect(nearest).toBeLessThan(0.004);
      }
      // A panicle axis starts at the tip of a culm and continues end to end; every other panicle tube is a lateral branch.
      const culmTips = new Set(of(plan, 'tiller').filter(isTube).map((t) => key(t.to))); const ends = new Set(tubes.map((t) => key(t.to)));
      const panicles = tubes.filter((t) => culmTips.has(key(t.from))).length;
      const lateral = tubes.filter((t) => !culmTips.has(key(t.from)) && !ends.has(key(t.from)));
      expect(panicles).toBeGreaterThanOrEqual(3);
      expect(lateral.length).toBeGreaterThanOrEqual(panicles * 6);
      // The branches leave the axis in different directions, not in one plane or one row.
      expect(new Set(lateral.map((t) => Math.round(Math.atan2(t.to[0] - t.from[0], t.to[2] - t.from[2]) * 4))).size).toBeGreaterThan(6);
    }
  });
});

describe('coffee: persistent frame, fruit cycle at the nodes', () => {
  const frameOf = (plan: PlantPlan) => of(plan, 'trunk', 'branch', 'leaf');

  it.each(SPECIES)('%s keeps exactly the same trunk, branches and leaves in every fruit phase', (species) => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const reference = frameOf(coffeePlan(species, adult('none'), variant, detail));
      expect(count(reference, 'trunk')).toBeGreaterThan(0);
      expect(count(reference, 'branch')).toBeGreaterThan(8);
      expect(count(reference, 'leaf')).toBeGreaterThan(40);
      for (const phase of PHASES) {
        const plan = coffeePlan(species, adult(phase), variant, detail);
        expect(frameOf(plan)).toEqual(reference);
        for (const prim of plan) expect(['trunk', 'branch', 'leaf', 'flower', 'fruit']).toContain(prim.organ);
      }
    }
  });

  it.each(SPECIES)('%s only adds or removes flowers and fruits with the phase', (species) => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const plan = (phase: CoffeeFruit) => coffeePlan(species, adult(phase), variant, detail);
      expect(count(plan('none'), 'flower', 'fruit')).toBe(0);
      expect(count(plan('harvested'), 'flower', 'fruit')).toBe(0);
      expect(plan('harvested').length).toBeGreaterThan(50); // not an empty spot: the whole bush is still there
      expect(count(plan('flowering'), 'flower')).toBeGreaterThan(8);
      expect(count(plan('flowering'), 'fruit')).toBe(0);
      expect(count(plan('green'), 'fruit')).toBeGreaterThan(8);
      expect(count(plan('green'), 'flower')).toBe(0);
      expect(count(plan('ripe'), 'fruit')).toBe(count(plan('green'), 'fruit'));
      expect(count(plan('flowering'), 'flower')).toBe(count(plan('green'), 'fruit')); // same axils
      expect(count(plan('ripe'), 'flower')).toBe(0);
    }
  });

  it.each(SPECIES)('%s ripens the fruits, not the canopy, and not all fruits at once', (species) => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const green = coffeePlan(species, adult('green'), variant, detail), ripe = coffeePlan(species, adult('ripe'), variant, detail);
      const fruitsGreen = of(green, 'fruit').filter(isBlob), fruitsRipe = of(ripe, 'fruit').filter(isBlob);
      for (const fruit of fruitsGreen) expect(greenness(fruit.color)).toBeGreaterThan(0);
      const red = fruitsRipe.filter((f) => greenness(f.color) < 0).length;
      expect(red).toBeGreaterThan(fruitsRipe.length * 0.5);
      expect(new Set(fruitsRipe.map((f) => f.color)).size).toBeGreaterThanOrEqual(2); // mixed ripeness
      expect(ripe).toEqual(coffeePlan(species, adult('ripe'), variant, detail)); // the mix is deterministic
      // Fruits get larger from green to ripe but stay small fruits.
      expect(mean(fruitsRipe.map((f) => f.radii[0]))).toBeGreaterThan(mean(fruitsGreen.map((f) => f.radii[0])));
      for (const fruit of fruitsRipe) expect(fruit.radii[1]).toBeLessThan(0.025);
      // No leaf changes colour and every leaf stays green.
      expect(of(ripe, 'leaf').map((l) => l.color)).toEqual(of(green, 'leaf').map((l) => l.color));
      for (const leaf of of(ripe, 'leaf')) expect(greenness(leaf.color)).toBeGreaterThan(20);
    }
  });

  it.each(SPECIES)('%s has branches and leaves in opposite pairs and bears at the branch nodes', (species) => {
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const plan = coffeePlan(species, adult('flowering'), variant, detail); const fruiting = coffeePlan(species, adult('ripe'), variant, detail);
      const branches = of(plan, 'branch').filter(isTube), leaves = of(plan, 'leaf').filter(isBlade), trunks = of(plan, 'trunk').filter(isTube);
      for (const size of groupSizes(branches.map((b) => b.from))) expect(size).toBe(2);
      for (const size of groupSizes(leaves.map((l) => l.at))) expect(size).toBe(2);
      // The two branches of a pair leave the stem in opposite directions.
      const byNode = new Map<string, Tube[]>(); for (const b of branches) byNode.set(key(b.from), [...(byNode.get(key(b.from)) ?? []), b]);
      for (const [a, b] of byNode.values()) { const da = sub(a.to, a.from), db = sub(b.to, b.from); expect(da[0] * db[0] + da[2] * db[2]).toBeLessThan(0); }
      // Branches start on a trunk; side branches are closer to horizontal than the trunk (plagiotropic vs orthotropic).
      for (const b of branches) {
        const onTrunk = Math.min(...trunks.map((t) => { const axis = unit(sub(t.to, t.from)); const v = sub(b.from, t.from); const along = v[0] * axis[0] + v[1] * axis[1] + v[2] * axis[2]; return len(sub(v, mul(axis, along))); }));
        expect(onTrunk).toBeLessThan(1e-6);
        expect(unit(sub(b.to, b.from))[1]).toBeLessThan(0.75);
      }
      for (const t of trunks) expect(unit(sub(t.to, t.from))[1]).toBeGreaterThan(0.9);
      // Flowers and fruits sit at leaf nodes of the branches, not anywhere on the canopy surface.
      const nodes = leaves.map((l) => l.at);
      for (const organ of [...of(plan, 'flower'), ...of(fruiting, 'fruit')].filter(isBlob)) expect(Math.min(...nodes.map((n) => len(sub(organ.at, n))))).toBeLessThan(0.05);
      const flowers = of(plan, 'flower').filter(isBlob);
      for (const flower of flowers) expect(channels(flower.color).every((c) => c > 230)).toBe(true); // white
    }
  });

  it('draws a seedling as a small young plant without flowers or fruits', () => {
    for (const species of SPECIES) for (const detail of DETAILS) for (const variant of VARIANTS) {
      const grown = coffeePlan(species, adult('none'), variant, detail);
      for (const phase of PHASES) {
        const young = coffeePlan(species, seedling(phase), variant, detail);
        expect(count(young, 'flower', 'fruit')).toBe(0);
        expect(count(young, 'trunk')).toBe(1);
        expect(count(young, 'leaf')).toBeGreaterThanOrEqual(6);
        expect(top(young)).toBeLessThan(top(grown) * 0.3);
        expect(young.length).toBeLessThan(grown.length * 0.25);
        expect(young).toEqual(coffeePlan(species, seedling('none'), variant, detail));
      }
    }
  });

  it('keeps adults around two metres, whatever the phase', () => {
    for (const species of SPECIES) for (const variant of VARIANTS) for (const phase of PHASES) {
      const height = top(coffeePlan(species, adult(phase), variant, 'detail'));
      expect(height).toBeGreaterThan(1.7);
      expect(height).toBeLessThan(2.2);
      expect(bounds(coffeePlan(species, adult(phase), variant, 'detail'), ['branch', 'leaf', 'flower', 'fruit'])?.min[1] ?? -1).toBeGreaterThan(0.05);
    }
  });

  it('uses a single stem for the arabica profile and several, configurable, for the conilon profile', () => {
    expect(COFFEE_PROFILE.coffee_arabica.stems).toBe(1);
    expect(COFFEE_PROFILE.coffee_conilon.stems).toBe(4);
    for (const detail of DETAILS) for (const variant of VARIANTS) {
      const arabica = coffeePlan('coffee_arabica', adult('green'), variant, detail), conilon = coffeePlan('coffee_conilon', adult('green'), variant, detail);
      expect(count(arabica, 'trunk')).toBe(1);
      expect(count(conilon, 'trunk')).toBe(4);
      expect(count(conilon, 'trunk')).toBeGreaterThan(count(arabica, 'trunk'));
      for (const stems of [1, 2, 3, 5, 6]) {
        const plan = coffeePlan('coffee_conilon', adult('green'), variant, detail, { stems });
        expect(count(plan, 'trunk')).toBe(stems);
        expect(tris(plan, detail)).toBeLessThanOrEqual(COFFEE_BUDGET[detail]);
      }
      expect(coffeePlan('coffee_conilon', adult('green'), variant, detail, { stems: 4 })).toEqual(conilon);
      // The training profile is an option of the drawing, not a property of the species id.
      expect(count(coffeePlan('coffee_arabica', adult('green'), variant, detail, { stems: 3 }), 'trunk')).toBe(3);
      // Several stems lean apart from a shared base; the single stem stands upright.
      const stems = of(conilon, 'trunk').filter(isTube);
      for (const stem of stems) expect(Math.hypot(stem.from[0], stem.from[2])).toBeLessThan(0.1);
      expect(new Set(stems.map((s) => key(s.to))).size).toBe(4);
    }
  });

  it('gives arabica a conical canopy and conilon a more open one with somewhat larger leaves, in the same colours', () => {
    for (const variant of VARIANTS) {
      const arabica = coffeePlan('coffee_arabica', adult('ripe'), variant, 'detail'), conilon = coffeePlan('coffee_conilon', adult('ripe'), variant, 'detail');
      // Conical: the lowest branches reach much further than the highest ones.
      const reach = of(arabica, 'branch').filter(isTube).sort((a, b) => a.from[1] - b.from[1]).map((b) => len(sub(b.to, b.from)));
      expect(mean(reach.slice(0, 4))).toBeGreaterThan(mean(reach.slice(-4)) * 2);
      const size = (plan: PlantPlan) => mean(of(plan, 'leaf').filter(isBlade).map((l) => l.length));
      expect(size(conilon)).toBeGreaterThan(size(arabica) * 1.05);
      expect(size(conilon)).toBeLessThan(size(arabica) * 1.5);
      // More open: far fewer leaves on each side branch, over a canopy that is at least as wide.
      const spread = (plan: PlantPlan) => { const b = bounds(plan, ['leaf']); return b ? Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2]) : 0; };
      expect(count(conilon, 'leaf') / count(conilon, 'branch')).toBeLessThan((count(arabica, 'leaf') / count(arabica, 'branch')) * 0.7);
      expect(spread(conilon)).toBeGreaterThan(spread(arabica) * 0.9);
      // Same palette for leaves and fruits: the species are not told apart by colour.
      expect(new Set(of(conilon, 'leaf').map((l) => l.color))).toEqual(new Set(of(arabica, 'leaf').map((l) => l.color)));
      expect(new Set(of(conilon, 'fruit').map((f) => f.color))).toEqual(new Set(of(arabica, 'fruit').map((f) => f.color)));
    }
  });

  it.each(SPECIES)('%s is deterministic, varies with the variant and stays inside the triangle budget', (species) => {
    for (const detail of DETAILS) {
      expect(coffeePlan(species, adult('ripe'), 0, detail)).not.toEqual(coffeePlan(species, adult('ripe'), 1, detail));
      expect(coffeePlan(species, seedling('none'), 0, detail)).not.toEqual(coffeePlan(species, seedling('none'), 1, detail));
      for (const variant of VARIANTS) for (const phase of PHASES) {
        const plan = coffeePlan(species, adult(phase), variant, detail);
        expect(plan).toEqual(coffeePlan(species, adult(phase), variant, detail));
        expect(tris(plan, detail)).toBeLessThanOrEqual(COFFEE_BUDGET[detail]);
      }
    }
  });
});
