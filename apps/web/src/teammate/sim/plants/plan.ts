// Plant "plans": a plant described as a list of organ primitives, as plain data (no three.js).
// The 3D mesher (mesh.ts, lazy chunk) and the 2D fallback (Plant2D) both read the same plan, so they cannot disagree
// about which organs exist at a given stage. Units are authoring metres, Y up, pivot at the soil surface.
// Every dimension here is an artistic parameter of an illustration — never an agronomic recommendation or a measurement.

export type V3 = readonly [number, number, number];
export const v3 = (x: number, y: number, z: number): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Direction with a compass angle around Y (yaw) and an elevation above the horizontal (pitch), both in radians. */
export const dir = (yaw: number, pitch: number): V3 => [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
export const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
/** 0 before `a`, 1 after `b`, linear in between. */
export const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function mixHex(a: string, b: string, t: number): string {
  const k = clamp01(t);
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * k).toString(16).padStart(2, '0')).join('')}`;
}

/** Botanical organ a primitive belongs to. Tests and the legend read this; the renderer only reads shapes and colours. */
export type Organ =
  | 'stem' | 'petiole' | 'branch' | 'trunk' | 'tiller'
  | 'cotyledon' | 'leaf' | 'leaflet' | 'husk'
  | 'flower' | 'pod' | 'tassel' | 'ear' | 'silk' | 'panicle' | 'grain' | 'spike' | 'awn' | 'fruit'
  | 'straw';
export const REPRODUCTIVE: readonly Organ[] = ['flower', 'pod', 'tassel', 'ear', 'silk', 'panicle', 'grain', 'spike', 'awn', 'fruit'];

export type BladeShape = 'ovate' | 'lance' | 'strap' | 'elliptic';
/** A curved lamina: starts at `at`, leaves in the `yaw` direction at `pitch` above the horizontal and bends down by `droop`. */
export type Blade = { kind: 'blade'; organ: Organ; at: V3; yaw: number; pitch: number; length: number; width: number; droop: number; fold: number; shape: BladeShape; color: string; tip?: string };
/** A tapered cylinder between two points. */
export type Tube = { kind: 'tube'; organ: Organ; from: V3; to: V3; r0: number; r1: number; color: string };
/** An ellipsoid whose long (second) radius lies along `axis`. */
export type Blob = { kind: 'blob'; organ: Organ; at: V3; radii: V3; axis: V3; color: string };
/** A closed pod: a slightly curved, laterally flattened capsule starting at `at` along `dir`. */
export type Pod = { kind: 'pod'; organ: Organ; at: V3; dir: V3; length: number; radius: number; curve: number; color: string };
export type Prim = Blade | Tube | Blob | Pod;
export type PlantPlan = Prim[];

/** Level of detail a plan is built for. `detail`: one plant seen closely. `field`: hundreds of plants. `far`: phones. */
export type Detail = 'detail' | 'field' | 'far';

export const count = (plan: PlantPlan, ...organs: Organ[]) => plan.filter((p) => organs.includes(p.organ)).length;

const WIDTH: Record<BladeShape, (t: number) => number> = {
  ovate: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.72)), 0.8),
  elliptic: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.9)), 0.7) * (1 - 0.25 * t * t * t),
  lance: (t) => Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.9),
  strap: (t) => Math.min(1, 0.55 + t * 4) * Math.pow(1 - Math.pow(t, 2.4), 0.8),
};
const STEPS: Record<Detail, Record<BladeShape, number[]>> = {
  detail: { ovate: [0, 0.12, 0.28, 0.45, 0.62, 0.8, 1], elliptic: [0, 0.14, 0.32, 0.5, 0.7, 0.86, 1], lance: [0, 0.1, 0.25, 0.42, 0.6, 0.8, 1], strap: [0, 0.08, 0.2, 0.34, 0.48, 0.62, 0.76, 0.9, 1] },
  field: { ovate: [0, 0.42, 1], elliptic: [0, 0.45, 1], lance: [0, 0.35, 1], strap: [0, 0.22, 0.55, 0.82, 1] },
  far: { ovate: [0, 0.42, 1], elliptic: [0, 0.45, 1], lance: [0, 0.35, 1], strap: [0, 0.4, 1] },
};
export type BladeRow = { t: number; l: V3; m: V3; r: V3; point: boolean };
/** Cross-sections of a blade, base to tip: left edge, midrib, right edge. Shared by the mesher and the 2D drawing. */
export function bladeRows(b: Blade, detail: Detail): BladeRow[] {
  const ts = STEPS[detail][b.shape]; const h: V3 = [Math.sin(b.yaw), 0, Math.cos(b.yaw)], c: V3 = [Math.cos(b.yaw), 0, -Math.sin(b.yaw)];
  const angle = (t: number) => b.pitch - b.droop * Math.pow(t, 1.35);
  const rows: BladeRow[] = []; let p: V3 = b.at; let prev = 0;
  for (const t of ts) {
    // Integrate the centre line in small sub-steps so coarse and fine samplings follow the same curve.
    const n = Math.max(1, Math.ceil((t - prev) * 12));
    for (let k = 0; k < n; k++) { const tm = prev + ((t - prev) * (k + 0.5)) / n, a = angle(tm), ds = (b.length * (t - prev)) / n; p = add(p, [h[0] * Math.cos(a) * ds, Math.sin(a) * ds, h[2] * Math.cos(a) * ds]); }
    prev = t;
    const a = angle(t), w = (b.width / 2) * WIDTH[b.shape](t), lift = b.fold * w;
    const normal: V3 = [-h[0] * Math.sin(a), Math.cos(a), -h[2] * Math.sin(a)];
    const edge = (s: number): V3 => add(add(p, mul(c, s * w)), mul(normal, lift));
    rows.push({ t, l: edge(-1), m: p, r: edge(1), point: w < 1e-5 });
  }
  return rows;
}

export type PodRing = { c: V3; r: number };
const POD_T: Record<Detail, number[]> = { detail: [0, 0.15, 0.5, 0.85, 1], field: [0, 0.5, 1], far: [0, 0.5, 1] };
/** Centre and radius of pod sections from the pedicel to the beak. */
export function podRings(p: Pod, detail: Detail): PodRing[] {
  const d = unit(p.dir); const side = unit(Math.abs(d[1]) > 0.95 ? cross(d, [1, 0, 0]) : cross(d, [0, 1, 0]));
  return POD_T[detail].map((t) => ({ c: add(add(p.at, mul(d, p.length * t)), mul(side, p.curve * p.length * Math.sin(Math.PI * t))), r: p.radius * Math.pow(Math.sin(Math.PI * Math.min(0.97, Math.max(0.03, t))), 0.45) * (t === 0 || t === 1 ? 0 : 1) }));
}

/** Bounding box of a plan (approximate for blades: sampled at field detail). */
export function bounds(plan: PlantPlan, only?: readonly Organ[]): { min: V3; max: V3 } | null {
  let lo: [number, number, number] | null = null, hi: [number, number, number] | null = null;
  const eat = (p: V3, pad = 0) => { if (!lo || !hi) { lo = [p[0] - pad, p[1] - pad, p[2] - pad]; hi = [p[0] + pad, p[1] + pad, p[2] + pad]; return; } for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i] - pad); hi[i] = Math.max(hi[i], p[i] + pad); } };
  for (const p of plan) {
    if (only && !only.includes(p.organ)) continue;
    if (p.kind === 'blade') for (const r of bladeRows(p, 'field')) { eat(r.l); eat(r.r); eat(r.m); }
    else if (p.kind === 'tube') { eat(p.from, p.r0); eat(p.to, p.r1); }
    else if (p.kind === 'blob') eat(p.at, Math.max(p.radii[0], p.radii[1], p.radii[2]));
    else for (const r of podRings(p, 'field')) eat(r.c, r.r);
  }
  return lo && hi ? { min: lo, max: hi } : null;
}

// Authoring helpers used by the crop builders.
export const tube = (organ: Organ, from: V3, to: V3, r0: number, r1: number, color: string): Tube => ({ kind: 'tube', organ, from, to, r0, r1, color });
export const blob = (organ: Organ, at: V3, radii: V3, color: string, axis: V3 = [0, 1, 0]): Blob => ({ kind: 'blob', organ, at, radii, axis, color });
export const blade = (organ: Organ, at: V3, yaw: number, pitch: number, length: number, width: number, droop: number, fold: number, shape: BladeShape, color: string, tip?: string): Blade => ({ kind: 'blade', organ, at, yaw, pitch, length, width, droop, fold, shape, color, tip });
export const pod = (organ: Organ, at: V3, d: V3, length: number, radius: number, curve: number, color: string): Pod => ({ kind: 'pod', organ, at, dir: d, length, radius, curve, color });
