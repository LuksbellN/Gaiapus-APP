// Plot geometry: GeoJSON Polygon in WGS84, positions as [longitude, latitude]. Pure functions, no map library.
// The MVP accepts one simple ring (no holes, no multi-polygons). The same rules must be enforced by the server
// when plots are persisted there; today they only guard the browser-local store.
export type Position = [number, number];
export type PolygonGeometry = { type: 'Polygon'; coordinates: Position[][] };
export type GeometryError = 'unsupported_type' | 'holes_unsupported' | 'not_finite' | 'out_of_range' | 'not_closed' | 'too_few_vertices' | 'zero_area' | 'self_intersection';
export type GeometryResult = { ok: true; geometry: PolygonGeometry } | { ok: false; code: GeometryError };

const same = (a: Position, b: Position) => a[0] === b[0] && a[1] === b[1];
/** Closed ring from an open list of vertices (the first position is repeated at the end). */
export function closeRing(vertices: readonly Position[]): Position[] {
  const ring = vertices.map((v): Position => [v[0], v[1]]);
  if (ring.length && !same(ring[0], ring[ring.length - 1])) ring.push([ring[0][0], ring[0][1]]);
  return ring;
}
/** Open list of vertices of a stored polygon (closing position dropped). */
export const openVertices = (g: PolygonGeometry): Position[] => g.coordinates[0].slice(0, -1).map((v): Position => [v[0], v[1]]);

const cross = (o: Position, a: Position, b: Position) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const onSegment = (a: Position, b: Position, p: Position) => Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
/** Segments a-b and c-d share at least one point (touching counts). */
function segmentsIntersect(a: Position, b: Position, c: Position, d: Position) {
  const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return (d1 === 0 && onSegment(c, d, a)) || (d2 === 0 && onSegment(c, d, b)) || (d3 === 0 && onSegment(a, b, c)) || (d4 === 0 && onSegment(a, b, d));
}
/** Any two non-adjacent edges of the closed ring touch or cross. */
function selfIntersects(ring: readonly Position[]) {
  const n = ring.length - 1;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (j === i + 1 || (i === 0 && j === n - 1)) continue;
    if (segmentsIntersect(ring[i], ring[i + 1], ring[j], ring[j + 1])) return true;
  }
  return false;
}
const planarArea2 = (ring: readonly Position[]) => { let s = 0; for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]; return s; };

export function validatePolygon(input: unknown): GeometryResult {
  const g = input as { type?: unknown; coordinates?: unknown } | null;
  if (!g || typeof g !== 'object' || g.type !== 'Polygon' || !Array.isArray(g.coordinates) || g.coordinates.length === 0 || !g.coordinates.every(Array.isArray)) return { ok: false, code: 'unsupported_type' };
  if (g.coordinates.length > 1) return { ok: false, code: 'holes_unsupported' };
  const raw = g.coordinates[0] as unknown[];
  const ring: Position[] = [];
  for (const p of raw) {
    if (!Array.isArray(p) || p.length < 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number' || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return { ok: false, code: 'not_finite' };
    if (p[0] < -180 || p[0] > 180 || p[1] < -90 || p[1] > 90) return { ok: false, code: 'out_of_range' };
    ring.push([p[0], p[1]]);
  }
  if (ring.length < 2 || !same(ring[0], ring[ring.length - 1])) return { ok: false, code: ring.length < 3 ? 'too_few_vertices' : 'not_closed' };
  const distinct = new Set(ring.slice(0, -1).map((p) => `${p[0]},${p[1]}`));
  if (distinct.size < 3) return { ok: false, code: 'too_few_vertices' };
  // Crossing first: a symmetric bow tie has a net signed area of zero and would otherwise be reported as flat.
  if (selfIntersects(ring)) return { ok: false, code: 'self_intersection' };
  if (planarArea2(ring) === 0) return { ok: false, code: 'zero_area' };
  return { ok: true, geometry: { type: 'Polygon', coordinates: [ring] } };
}

// WGS84 ellipsoid.
const A = 6378137, E2 = 0.00669437999014;
const RAD = Math.PI / 180;
/**
 * Area in hectares on the WGS84 ellipsoid. Vertices are projected onto the local tangent frame at the ring's mean
 * latitude using the meridional (M) and prime-vertical (N) radii of curvature, then the shoelace formula is applied.
 * For plot-sized polygons (a few kilometres) the error against a full geodesic computation is far below 0.1 %;
 * it is not meant for regions hundreds of kilometres wide. Never computed from pixels or square degrees.
 */
export function geodesicAreaHa(g: PolygonGeometry): number {
  const ring = g.coordinates[0]; const n = ring.length - 1;
  const lat0 = ring.slice(0, n).reduce((s, p) => s + p[1], 0) / n, lon0 = ring[0][0];
  const sin = Math.sin(lat0 * RAD), w = 1 - E2 * sin * sin;
  const M = (A * (1 - E2)) / Math.pow(w, 1.5), N = A / Math.sqrt(w);
  const kx = N * Math.cos(lat0 * RAD) * RAD, ky = M * RAD;
  const local = ring.map((p): Position => [(p[0] - lon0) * kx, (p[1] - lat0) * ky]);
  return Math.abs(planarArea2(local)) / 2 / 10000;
}

/** Ray casting; a point exactly on the border may fall on either side. */
export function pointInPolygon(p: Position, g: PolygonGeometry): boolean {
  const ring = g.coordinates[0]; let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
/** Two plots share ground: edges cross, or one lies inside the other. Used for a warning, never to merge. */
export function polygonsOverlap(a: PolygonGeometry, b: PolygonGeometry): boolean {
  const ra = a.coordinates[0], rb = b.coordinates[0];
  for (let i = 0; i < ra.length - 1; i++) for (let j = 0; j < rb.length - 1; j++) if (segmentsIntersect(ra[i], ra[i + 1], rb[j], rb[j + 1])) return true;
  return pointInPolygon(ra[0], b) || pointInPolygon(rb[0], a);
}
export function centroid(g: PolygonGeometry): Position {
  const v = g.coordinates[0].slice(0, -1);
  return [v.reduce((s, p) => s + p[0], 0) / v.length, v.reduce((s, p) => s + p[1], 0) / v.length];
}
export function boundsOf(points: readonly Position[]): [Position, Position] | null {
  if (!points.length) return null;
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const p of points) { w = Math.min(w, p[0]); e = Math.max(e, p[0]); s = Math.min(s, p[1]); n = Math.max(n, p[1]); }
  return [[w, s], [e, n]];
}

const NUMBER = /^[+-]?\d+(\.\d+)?$/;
/**
 * Keyboard alternative to drawing: one vertex per line as "latitude, longitude" in decimal degrees with a decimal
 * point (the order people copy from maps). Separator: comma, semicolon or spaces. Returns [longitude, latitude].
 */
export function parseCoordinateText(text: string): { ok: true; vertices: Position[] } | { ok: false; line: number } {
  const vertices: Position[] = []; const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim(); if (!line) continue;
    const parts = line.split(/\s*[,;]\s*|\s+/).filter(Boolean);
    if (parts.length !== 2 || !parts.every((p) => NUMBER.test(p))) return { ok: false, line: i + 1 };
    vertices.push([Number(parts[1]), Number(parts[0])]);
  }
  return { ok: true, vertices };
}
export const formatCoordinateText = (vertices: readonly Position[]) => vertices.map((v) => `${v[1]}, ${v[0]}`).join('\n');
