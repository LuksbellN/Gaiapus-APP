// Plan → one merged BufferGeometry with per-vertex colours (three.js; lazy chunk only).
// One plant is one geometry and one material: an instanced batch draws a whole variant in a single call, and an organ
// that is absent simply has no triangles (nothing is kept at scale 0.0001).
import * as THREE from 'three';
import { bladeRows, cross, podRings, sub, unit, type Blade, type Blob, type Detail, type PlantPlan, type Pod, type Tube, type V3 } from './plan';

type Acc = { pos: number[]; col: number[]; idx: number[] };
type RGB = readonly [number, number, number];
const colors = new Map<string, RGB>();
/** Hex → linear-sRGB components, as vertex colours need (THREE.Color converts once; nothing is converted twice). */
function rgb(hex: string): RGB { let c = colors.get(hex); if (!c) { const k = new THREE.Color(hex); c = [k.r, k.g, k.b]; colors.set(hex, c); } return c; }
const vert = (a: Acc, p: V3, c: RGB) => { a.pos.push(p[0], p[1], p[2]); a.col.push(c[0], c[1], c[2]); return a.pos.length / 3 - 1; };
const tri = (a: Acc, i: number, j: number, k: number) => { a.idx.push(i, j, k); };
const frame = (axis: V3): [V3, V3, V3] => { const d = unit(axis); const u = unit(Math.abs(d[1]) > 0.95 ? cross(d, [1, 0, 0]) : cross(d, [0, 1, 0])); return [u, d, cross(d, u)]; };

function addBlade(a: Acc, b: Blade, detail: Detail) {
  const base = rgb(b.color), tip = b.tip ? rgb(b.tip) : base; const rows = bladeRows(b, detail);
  const ids = rows.map((r) => { const k = Math.pow(r.t, 1.6); const c: RGB = [base[0] + (tip[0] - base[0]) * k, base[1] + (tip[1] - base[1]) * k, base[2] + (tip[2] - base[2]) * k]; return r.point ? [vert(a, r.m, c)] : [vert(a, r.l, c), vert(a, r.m, c), vert(a, r.r, c)]; });
  for (let i = 0; i < ids.length - 1; i++) {
    const p = ids[i], q = ids[i + 1];
    if (p.length === 3 && q.length === 3) { tri(a, p[0], q[0], p[1]); tri(a, p[1], q[0], q[1]); tri(a, p[1], q[1], p[2]); tri(a, p[2], q[1], q[2]); }
    else if (p.length === 1 && q.length === 3) { tri(a, p[0], q[0], q[1]); tri(a, p[0], q[1], q[2]); }
    else if (p.length === 3 && q.length === 1) { tri(a, p[0], q[0], p[1]); tri(a, p[1], q[0], p[2]); }
  }
}

const SIDES: Record<Detail, number> = { detail: 6, field: 3, far: 3 };
function ring(a: Acc, centre: V3, u: V3, w: V3, ru: number, rw: number, sides: number, c: RGB) {
  const out: number[] = [];
  for (let s = 0; s < sides; s++) { const t = (s / sides) * Math.PI * 2, cu = Math.cos(t) * ru, cw = Math.sin(t) * rw; out.push(vert(a, [centre[0] + u[0] * cu + w[0] * cw, centre[1] + u[1] * cu + w[1] * cw, centre[2] + u[2] * cu + w[2] * cw], c)); }
  return out;
}
function bridge(a: Acc, p: number[], q: number[]) {
  const n = Math.max(p.length, q.length);
  for (let s = 0; s < n; s++) {
    const t = (s + 1) % n;
    if (p.length === 1) tri(a, p[0], q[t], q[s]);
    else if (q.length === 1) tri(a, p[s], p[t], q[0]);
    else { tri(a, p[s], p[t], q[s]); tri(a, p[t], q[t], q[s]); }
  }
}
function addTube(a: Acc, t: Tube, detail: Detail) {
  const [u, , w] = frame(sub(t.to, t.from)); const c = rgb(t.color); const sides = SIDES[detail];
  bridge(a, ring(a, t.from, u, w, t.r0, t.r0, sides, c), ring(a, t.to, u, w, t.r1, t.r1, sides, c));
}
/** Ellipsoid as stacked rings: the close-up gets a round shape, the field a bipyramid. */
const BLOB: Record<Detail, { sides: number; lat: number[] }> = { detail: { sides: 6, lat: [-0.62, 0, 0.62] }, field: { sides: 5, lat: [0] }, far: { sides: 3, lat: [0] } };
function addBlob(a: Acc, b: Blob, detail: Detail) {
  const [u, d, w] = frame(b.axis); const c = rgb(b.color); const { sides, lat } = BLOB[detail];
  const along = (k: number): V3 => [b.at[0] + d[0] * b.radii[1] * k, b.at[1] + d[1] * b.radii[1] * k, b.at[2] + d[2] * b.radii[1] * k];
  let prev = [vert(a, along(-1), c)];
  for (const k of lat) { const s = Math.sqrt(1 - k * k); const next = ring(a, along(k), u, w, b.radii[0] * s, b.radii[2] * s, sides, c); bridge(a, prev, next); prev = next; }
  bridge(a, prev, [vert(a, along(1), c)]);
}
function addPod(a: Acc, p: Pod, detail: Detail) {
  const [u, , w] = frame(p.dir); const c = rgb(p.color); const sides = detail === 'detail' ? 4 : 3;
  let prev: number[] | null = null;
  // Pods are flatter than they are wide: the section is an ellipse.
  for (const r of podRings(p, detail)) { const next = r.r <= 0 ? [vert(a, r.c, c)] : ring(a, r.c, u, w, r.r, r.r * 0.62, sides, c); if (prev) bridge(a, prev, next); prev = next; }
}

export function meshPlan(plan: PlantPlan, detail: Detail): THREE.BufferGeometry {
  const a: Acc = { pos: [], col: [], idx: [] };
  for (const p of plan) { if (p.kind === 'blade') addBlade(a, p, detail); else if (p.kind === 'tube') addTube(a, p, detail); else if (p.kind === 'blob') addBlob(a, p, detail); else addPod(a, p, detail); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(a.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(a.col, 3));
  g.setIndex(a.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(a.idx, 1) : new THREE.Uint16BufferAttribute(a.idx, 1));
  g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
export const triangles = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute('position').count) / 3;

/** Matte, double-sided, vertex-coloured: leaves are single sheets and must be lit from both sides without alpha. */
export const plantMaterial = () => new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.86, metalness: 0 });

/** Small LRU of built geometries: a pose is built once and reused while scrubbing; evicted geometries are disposed. */
export class GeometryCache {
  private map = new Map<string, THREE.BufferGeometry>();
  constructor(private limit = 48) {}
  get(key: string, build: () => THREE.BufferGeometry, keep?: ReadonlySet<string>): THREE.BufferGeometry {
    const hit = this.map.get(key);
    if (hit) { this.map.delete(key); this.map.set(key, hit); return hit; }
    const g = build(); this.map.set(key, g);
    for (const k of this.map.keys()) { if (this.map.size <= this.limit) break; if (k === key || keep?.has(k)) continue; this.map.get(k)?.dispose(); this.map.delete(k); }
    return g;
  }
  dispose() { for (const g of this.map.values()) g.dispose(); this.map.clear(); }
}
