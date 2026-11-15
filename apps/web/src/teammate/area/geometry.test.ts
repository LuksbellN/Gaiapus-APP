import { describe, expect, it } from 'vitest';
import { closeRing, formatCoordinateText, geodesicAreaHa, parseCoordinateText, pointInPolygon, polygonsOverlap, validatePolygon, type PolygonGeometry } from './geometry';

const square = (lon: number, lat: number, d: number): PolygonGeometry => ({ type: 'Polygon', coordinates: [closeRing([[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d]])] });
const code = (input: unknown) => { const r = validatePolygon(input); return r.ok ? 'ok' : r.code; };

describe('plot polygon validation (GeoJSON WGS84, [longitude, latitude])', () => {
  it('accepts a simple closed polygon', () => {
    expect(code(square(-48.27, -18.92, 0.01))).toBe('ok');
  });
  it('rejects anything that is not a simple Polygon', () => {
    expect(code(null)).toBe('unsupported_type');
    expect(code({ type: 'MultiPolygon', coordinates: [] })).toBe('unsupported_type');
    expect(code({ type: 'Polygon', coordinates: 'x' })).toBe('unsupported_type');
    const s = square(0, 0, 1);
    expect(code({ type: 'Polygon', coordinates: [s.coordinates[0], s.coordinates[0]] })).toBe('holes_unsupported');
  });
  it('rejects non-finite numbers and out-of-range coordinates', () => {
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], [1, Number.NaN], [1, 1], [0, 0]]] })).toBe('not_finite');
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], [1, Infinity], [1, 1], [0, 0]]] })).toBe('not_finite');
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], ['1', 0], [1, 1], [0, 0]]] })).toBe('not_finite');
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], [181, 0], [1, 1], [0, 0]]] })).toBe('out_of_range');
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], [1, -91], [1, 1], [0, 0]]] })).toBe('out_of_range');
  });
  it('rejects an open ring', () => {
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] })).toBe('not_closed');
  });
  it('requires three distinct vertices', () => {
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] })).toBe('too_few_vertices');
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 0], [0, 0], [0, 0]]] })).toBe('too_few_vertices');
  });
  it('rejects zero area', () => {
    expect(code({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [2, 2], [0, 0]]] })).toBe('zero_area');
  });
  it('rejects a self-intersecting ring (bow tie)', () => {
    expect(code({ type: 'Polygon', coordinates: [closeRing([[0, 0], [1, 1], [1, 0], [0, 1]])] })).toBe('self_intersection');
  });
});

describe('geodesic area in hectares', () => {
  it('matches the WGS84 degree lengths at the equator (0.001 x 0.001 degrees)', () => {
    // 1 degree of longitude at the equator: 111,319.49 m; 1 degree of latitude: 110,574.3 m.
    const expected = (111.31949 * 110.5743) / 10000;
    expect(geodesicAreaHa(square(-50, 0, 0.001))).toBeCloseTo(expected, 3);
  });
  it('matches the WGS84 degree lengths at 15 degrees of latitude (0.01 x 0.01 degrees)', () => {
    // Published table values at 15 degrees: 1 degree of latitude 110,649 m, 1 degree of longitude 107,550 m.
    const expected = (1106.49 * 1075.5) / 10000;
    const got = geodesicAreaHa(square(-48, -15.005, 0.01));
    expect(Math.abs(got - expected) / expected).toBeLessThan(0.001);
  });
  it('is not square degrees and does not depend on winding order', () => {
    const s = square(-48.27, -18.92, 0.01);
    const reversed: PolygonGeometry = { type: 'Polygon', coordinates: [[...s.coordinates[0]].reverse()] };
    expect(geodesicAreaHa(s)).toBeGreaterThan(100);
    expect(geodesicAreaHa(reversed)).toBeCloseTo(geodesicAreaHa(s), 6);
  });
  it('shrinks with latitude for the same span in degrees', () => {
    expect(geodesicAreaHa(square(0, 60, 0.01))).toBeLessThan(geodesicAreaHa(square(0, 0, 0.01)) * 0.52);
  });
});

describe('point and overlap tests', () => {
  const a = square(0, 0, 1);
  it('tells inside from outside', () => {
    expect(pointInPolygon([0.5, 0.5], a)).toBe(true);
    expect(pointInPolygon([1.5, 0.5], a)).toBe(false);
  });
  it('detects overlap by crossing edges or containment, not by distance', () => {
    expect(polygonsOverlap(a, square(0.5, 0.5, 1))).toBe(true);
    expect(polygonsOverlap(a, square(0.25, 0.25, 0.5))).toBe(true);
    expect(polygonsOverlap(a, square(2, 2, 1))).toBe(false);
  });
});

describe('coordinate text (keyboard alternative to drawing)', () => {
  it('reads "latitude, longitude" per line and returns [longitude, latitude] vertices', () => {
    const r = parseCoordinateText('-18.92, -48.27\n-18.92; -48.26\n\n-18.91 -48.26\n');
    expect(r).toEqual({ ok: true, vertices: [[-48.27, -18.92], [-48.26, -18.92], [-48.26, -18.91]] });
  });
  it('reports the first line it cannot read', () => {
    expect(parseCoordinateText('-18.92, -48.27\nabc')).toEqual({ ok: false, line: 2 });
    expect(parseCoordinateText('-18.92')).toEqual({ ok: false, line: 1 });
    expect(parseCoordinateText('-18.92, -48.27, 3')).toEqual({ ok: false, line: 1 });
  });
  it('round-trips through the formatter', () => {
    const v: [number, number][] = [[-48.27, -18.92], [-48.26, -18.92], [-48.26, -18.91]];
    expect(parseCoordinateText(formatCoordinateText(v))).toEqual({ ok: true, vertices: v });
  });
});
