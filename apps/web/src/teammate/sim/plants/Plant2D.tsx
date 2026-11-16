// Side view of a plant plan as SVG (no three.js): the 2D fallback draws the SAME organs as the 3D scene,
// so soybean and maize stay different plants without WebGL and a stage change shows the same organs.
import { bladeRows, type PlantPlan, type V3 } from './plan';

/** Slightly turned side view: X across, Y up, plus a depth used only to paint far organs first. */
const VIEW = 0.42, COS = Math.cos(VIEW), SIN = Math.sin(VIEW);
const project = (p: V3): [number, number, number] => [p[0] * COS + p[2] * SIN, p[1], -p[0] * SIN + p[2] * COS];
const n = (v: number) => (Math.round(v * 10) / 10).toString();

export function Plant2D({ plan, scale }: { plan: PlantPlan; scale: number }) {
  const P = (p: V3): [number, number, number] => { const q = project(p); return [q[0] * scale, -q[1] * scale, q[2]]; };
  const items = plan.map((p, i) => {
    if (p.kind === 'blade') {
      const rows = bladeRows(p, 'far'); const left = rows.map((r) => P(r.l)), right = rows.map((r) => P(r.r)).reverse();
      const d = [...left, ...right].map((q, k) => `${k ? 'L' : 'M'}${n(q[0])},${n(q[1])}`).join('') + 'Z';
      return { depth: P(rows[Math.floor(rows.length / 2)].m)[2], el: <path key={i} d={d} fill={p.color} stroke={p.color} strokeWidth={0.7} strokeLinejoin="round" /> };
    }
    if (p.kind === 'tube') { const a = P(p.from), b = P(p.to); return { depth: (a[2] + b[2]) / 2, el: <line key={i} x1={n(a[0])} y1={n(a[1])} x2={n(b[0])} y2={n(b[1])} stroke={p.color} strokeWidth={n(Math.max(1, (p.r0 + p.r1) * scale))} strokeLinecap="round" /> }; }
    if (p.kind === 'blob') {
      const c = P(p.at); const axis = project(p.axis); const angle = (Math.atan2(axis[0], axis[1]) * 180) / Math.PI;
      return { depth: c[2], el: <ellipse key={i} cx={n(c[0])} cy={n(c[1])} rx={n(Math.max(0.8, p.radii[0] * scale))} ry={n(Math.max(0.8, p.radii[1] * scale))} fill={p.color} transform={`rotate(${n(angle)} ${n(c[0])} ${n(c[1])})`} /> };
    }
    const a = P(p.at), b = P([p.at[0] + p.dir[0] * p.length, p.at[1] + p.dir[1] * p.length, p.at[2] + p.dir[2] * p.length]);
    return { depth: (a[2] + b[2]) / 2, el: <line key={i} x1={n(a[0])} y1={n(a[1])} x2={n(b[0])} y2={n(b[1])} stroke={p.color} strokeWidth={n(Math.max(1.2, p.radius * 2 * scale))} strokeLinecap="round" /> };
  });
  items.sort((a, b) => a.depth - b.depth);
  return <>{items.map((x) => x.el)}</>;
}
