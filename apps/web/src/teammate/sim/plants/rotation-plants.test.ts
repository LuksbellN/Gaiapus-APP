import { describe, expect, it } from 'vitest';
import { annualPose, CROP_STAGES, type AnnualPose } from '../visual-state';
import { brachiariaPlan, residuePlan } from './grass';
import { EAR_AT, MAIZE_HEIGHT_M, maizePlan } from './maize';
import { meshPlan, triangles } from './mesh';
import { bounds, count, REPRODUCTIVE, type Blade, type Detail, type PlantPlan, type Pod } from './plan';
import { soyPlan, SOY_HEIGHT_M } from './soy';

const tris = (plan: PlantPlan, detail: Detail) => triangles(meshPlan(plan, detail));
const top = (plan: PlantPlan) => bounds(plan)?.max[1] ?? 0;
const DETAILS: Detail[] = ['detail', 'field', 'far'];

describe('soybean plan', () => {
  it('starts with cotyledons and a pair of simple leaves, with no reproductive organ', () => {
    const p = soyPlan(annualPose('establishment', 0.5), 0, 'detail');
    expect(count(p, 'cotyledon')).toBe(2); expect(count(p, 'leaf')).toBe(2); expect(count(p, ...REPRODUCTIVE)).toBe(0);
    expect(top(p)).toBeLessThan(0.25);
  });
  it('builds leaves in groups of three leaflets and adds branches as it grows', () => {
    const p = soyPlan(annualPose('vegetative', 1), 0, 'detail');
    expect(count(p, 'leaflet') % 3).toBe(0); expect(count(p, 'leaflet')).toBeGreaterThanOrEqual(45); expect(count(p, 'branch')).toBeGreaterThanOrEqual(3);
    expect(count(p, 'cotyledon')).toBe(0); expect(count(p, ...REPRODUCTIVE)).toBe(0);
  });
  it('flowers first, then closed short pods at the nodes; filling enlarges the pod, not the plant', () => {
    const flowering = soyPlan(annualPose('reproductive', 0.25), 0, 'detail'), early = soyPlan(annualPose('reproductive', 0.6), 0, 'detail'), late = soyPlan(annualPose('reproductive', 1), 0, 'detail');
    expect(count(flowering, 'flower')).toBeGreaterThan(10); expect(count(flowering, 'pod')).toBe(0);
    expect(count(late, 'pod')).toBeGreaterThan(20); expect(count(late, 'flower')).toBe(0);
    const len = (p: PlantPlan) => Math.max(...p.filter((x): x is Pod => x.kind === 'pod').map((x) => x.length));
    expect(len(late)).toBeGreaterThan(len(early)); expect(len(late)).toBeLessThan(0.07); // short pods, not bean-like
    expect(top(late)).toBeCloseTo(top(early), 1);
  });
  it('maturation sheds leaves gradually and keeps stem and pods', () => {
    const start = soyPlan(annualPose('maturation', 0), 1, 'detail'), mid = soyPlan(annualPose('maturation', 0.5), 1, 'detail'), end = soyPlan(annualPose('maturation', 1), 1, 'detail');
    expect(count(mid, 'leaflet')).toBeLessThan(count(start, 'leaflet')); expect(count(mid, 'leaflet')).toBeGreaterThan(0);
    expect(count(end, 'leaflet')).toBe(0);
    expect(count(end, 'pod')).toBe(count(start, 'pod')); expect(count(end, 'stem')).toBe(1); expect(count(end, 'branch')).toBe(count(start, 'branch'));
    // Not one uniform colour swap: half-way, green and yellowing leaflets coexist.
    expect(new Set(mid.filter((x) => x.organ === 'leaflet').map((x) => x.color)).size).toBeGreaterThan(2);
    expect(top(end)).toBeLessThanOrEqual(SOY_HEIGHT_M * 1.1);
  });
  it('the field level keeps trifoliolates and pods', () => {
    const p = soyPlan(annualPose('reproductive', 0.9), 0, 'field');
    expect(count(p, 'leaflet') % 3).toBe(0); expect(count(p, 'leaflet')).toBeGreaterThan(30); expect(count(p, 'pod')).toBeGreaterThan(10);
  });
});

describe('maize plan', () => {
  it('a seedling has a few leaves and neither tassel nor ear', () => {
    const p = maizePlan(annualPose('establishment', 0.5), 0, 'detail');
    expect(count(p, 'leaf')).toBeGreaterThanOrEqual(3); expect(count(p, 'leaf')).toBeLessThanOrEqual(5); expect(count(p, 'tassel', 'ear', 'silk')).toBe(0);
  });
  it('leaves leave the stalk alternately at successive heights', () => {
    const leaves = maizePlan(annualPose('vegetative', 1), 0, 'detail').filter((x): x is Blade => x.organ === 'leaf' && x.kind === 'blade');
    expect(leaves.length).toBeGreaterThanOrEqual(10);
    for (let i = 1; i < leaves.length; i++) { expect(leaves[i].at[1]).toBeGreaterThan(leaves[i - 1].at[1]); expect(Math.cos(leaves[i].yaw - leaves[i - 1].yaw)).toBeLessThan(-0.5); }
  });
  it('the tassel is terminal and the husked ear is lateral, at mid height', () => {
    for (const detail of DETAILS) {
      const p = maizePlan(annualPose('reproductive', 0.9), 0, detail); const stalkTop = bounds(p, ['stem'])!.max[1];
      const tassel = bounds(p, ['tassel'])!, ear = bounds(p, ['ear'])!;
      expect(tassel.min[1]).toBeGreaterThanOrEqual(stalkTop - 0.03);
      expect(ear.max[1]).toBeLessThan(stalkTop * 0.75); expect(ear.min[1]).toBeGreaterThan(stalkTop * (EAR_AT - 0.2));
      expect(Math.max(Math.abs(ear.min[0]), Math.abs(ear.max[0]), Math.abs(ear.min[2]), Math.abs(ear.max[2]))).toBeGreaterThan(0.06); // beside the stalk, not on its axis
      expect(count(p, 'ear')).toBe(1);
    }
  });
  it('grain filling enlarges the ear and does not make the plant taller', () => {
    const size = (pose: AnnualPose) => { const p = maizePlan(pose, 0, 'detail'); const e = p.find((x) => x.organ === 'ear'); return { ear: e && e.kind === 'blob' ? e.radii[1] : 0, stalk: bounds(p, ['stem'])!.max[1] }; };
    const flowering = size(annualPose('reproductive', 0.45)), filled = size(annualPose('reproductive', 1));
    expect(filled.ear).toBeGreaterThan(flowering.ear * 1.6); expect(filled.stalk).toBeCloseTo(flowering.stalk, 5);
    expect(filled.stalk).toBeLessThanOrEqual(MAIZE_HEIGHT_M * 1.06);
  });
  it('maturation dries organ by organ: leaves from the bottom, silks before the husk, structure preserved', () => {
    const mid = maizePlan(annualPose('maturation', 0.4), 0, 'detail'), end = maizePlan(annualPose('maturation', 1), 0, 'detail');
    expect(new Set(mid.filter((x) => x.organ === 'leaf').map((x) => x.color)).size).toBeGreaterThan(3);
    expect(count(end, 'stem')).toBe(1); expect(count(end, 'ear')).toBe(1); expect(count(end, 'tassel')).toBeGreaterThan(3); expect(count(end, 'leaf')).toBeGreaterThanOrEqual(8);
  });
});

describe('brachiaria cover and residue', () => {
  it('living cover is a tussock of tillers with long blades and no reproductive organ', () => {
    const p = brachiariaPlan('living', 0, 'detail');
    expect(count(p, 'tiller')).toBeGreaterThanOrEqual(8); expect(count(p, 'leaf')).toBeGreaterThanOrEqual(24); expect(count(p, ...REPRODUCTIVE, 'straw')).toBe(0);
    expect(top(p)).toBeLessThan(0.6);
    expect(top(brachiariaPlan('young', 0, 'detail'))).toBeLessThan(top(brachiariaPlan('understory', 0, 'detail')));
  });
  it('residue is loose straw: flat, irregular lengths and directions, not a flattened tussock', () => {
    const p = residuePlan(0, 'detail'); const blades = p.filter((x): x is Blade => x.kind === 'blade');
    expect(p.every((x) => x.organ === 'straw')).toBe(true); expect(top(p)).toBeLessThan(0.16);
    const lengths = blades.map((b) => b.length); expect(Math.max(...lengths) / Math.min(...lengths)).toBeGreaterThan(3);
    // Fragments do not start from one centre and do not point away from it.
    const starts = blades.map((b) => Math.hypot(b.at[0], b.at[2])); expect(starts.filter((d) => d > 0.2).length).toBeGreaterThan(blades.length / 2);
    const radial = blades.filter((b) => Math.cos(b.yaw - Math.atan2(b.at[0], b.at[2])) > 0.8).length; expect(radial).toBeLessThan(blades.length / 2);
  });
});

describe('determinism and budget', () => {
  it('the same pose, variant and level always give the same plan', () => {
    for (const stage of CROP_STAGES) { const pose = annualPose(stage, 0.5); expect(soyPlan(pose, 2, 'field')).toEqual(soyPlan(pose, 2, 'field')); expect(maizePlan(pose, 2, 'field')).toEqual(maizePlan(pose, 2, 'field')); }
    expect(brachiariaPlan('living', 1, 'field')).toEqual(brachiariaPlan('living', 1, 'field'));
    expect(soyPlan(annualPose('vegetative', 0.5), 0, 'field')).not.toEqual(soyPlan(annualPose('vegetative', 0.5), 1, 'field'));
  });
  it('a plant keeps its identity while it grows (same node directions)', () => {
    const yaw = (f: number) => (maizePlan(annualPose('vegetative', f), 0, 'detail').find((x) => x.organ === 'leaf') as Blade).yaw;
    expect(yaw(0.3)).toBe(yaw(0.9));
  });
  it('stays inside the triangle budget of each level at the heaviest poses', () => {
    const heavy = [annualPose('reproductive', 0.9), annualPose('maturation', 0.2)];
    const limit: Record<Detail, number> = { detail: 4000, field: 900, far: 250 };
    for (const detail of DETAILS) for (const pose of heavy) for (const v of [0, 1, 2]) {
      expect(tris(soyPlan(pose, v, detail), detail)).toBeLessThanOrEqual(limit[detail]);
      expect(tris(maizePlan(pose, v, detail), detail)).toBeLessThanOrEqual(limit[detail]);
    }
    expect(tris(brachiariaPlan('living', 0, 'detail'), 'detail')).toBeLessThanOrEqual(2500);
    expect(tris(brachiariaPlan('living', 0, 'field'), 'field')).toBeLessThanOrEqual(300);
    expect(tris(brachiariaPlan('living', 0, 'far'), 'far')).toBeLessThanOrEqual(120);
  });
  it('the whole field stays inside the scene budget (540 slots: 14 at the detail level, 526 at the field or far level)', () => {
    // Same layout as Field3D: the cover adds one tussock per slot with a crop and two per slot when alone.
    const poses = [annualPose('vegetative', 1), annualPose('reproductive', 0.25), annualPose('reproductive', 0.9), annualPose('maturation', 0.2)];
    const worst = (build: (v: number, d: Detail) => PlantPlan, detail: Detail) => Math.max(...[0, 1, 2].map((v) => tris(build(v, detail), detail)));
    const scene = (crop: number[], cover: number[], coverSlots: number) => 14 * (crop[0] + cover[0] * coverSlots) + 526 * (crop[1] + cover[1] * coverSlots);
    for (const [rest, limit] of [['field', 500_000], ['far', 180_000]] as const) {
      const grass = (pose: 'understory' | 'living') => [worst((v, d) => brachiariaPlan(pose, v, d), 'detail'), worst((v, d) => brachiariaPlan(pose, v, d), rest)];
      for (const pose of poses) {
        const soy = [worst((v, d) => soyPlan(pose, v, d), 'detail'), worst((v, d) => soyPlan(pose, v, d), rest)], maize = [worst((v, d) => maizePlan(pose, v, d), 'detail'), worst((v, d) => maizePlan(pose, v, d), rest)];
        expect(scene(soy, [0, 0], 0)).toBeLessThanOrEqual(limit); expect(scene(maize, grass('understory'), 1)).toBeLessThanOrEqual(limit);
      }
      expect(scene([0, 0], grass('living'), 2)).toBeLessThanOrEqual(limit);
    }
  });
  it('an absent organ costs nothing: bare stages build no reproductive triangles', () => {
    const veg = soyPlan(annualPose('vegetative', 0.5), 0, 'field'); expect(veg.filter((x) => REPRODUCTIVE.includes(x.organ))).toEqual([]);
    const g = meshPlan(veg, 'field'); expect(g.getAttribute('color').count).toBe(g.getAttribute('position').count); expect(g.boundingSphere?.radius).toBeGreaterThan(0.1);
  });
});
