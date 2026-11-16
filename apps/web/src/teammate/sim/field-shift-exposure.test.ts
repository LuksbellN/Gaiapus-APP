// Rain on the days a strategy has no crop or cover: counts and sums over the published daily columns of the pinned package.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DailyColumns, FieldShiftSeries, FieldShiftSummary, StrategyId } from './field-shift-decision';
import { buildExposure, checkExposure, exposureByYear } from './field-shift-exposure';

const dir = join(process.cwd(), 'src', 'teammate', 'data', 'field-shift-v2');
const read = <T,>(name: string) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as T;
const summary = read<FieldShiftSummary>('summary.json');
const series = read<FieldShiftSeries>('series.json');
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A tiny series: [date, covered, rain]. */
const columns = (year: string, days: [string, boolean, number][]): DailyColumns => ({
  agricultural_year: days.map(() => year), date: days.map((d) => d[0]), land_cover: days.map((d) => (d[1] ? 'soy' : 'bare')), stage: days.map(() => 'x'),
  soil_covered: days.map((d) => d[1]), rain_mm: days.map((d) => d[2]), storage_end_mm: days.map(() => 0), et_deficit_mm: days.map(() => 0),
});

describe('formula on a case small enough to check by hand', () => {
  it('counts the days without crop or cover, those from November to April, and adds the rain of those days over the whole year', () => {
    const rows = exposureByYear(columns('2020/2021', [
      ['2020-10-31', false, 5],   // no cover, October: counts as a day and as rain, not as a November–April day
      ['2020-11-01', false, 10],  // no cover, November
      ['2020-11-02', true, 100],  // covered: its rain is never added
      ['2021-04-30', false, 2.5], // no cover, last day of April
      ['2021-05-01', false, 0],   // no cover, May, dry
    ]));
    expect(rows).toEqual([{ agricultural_year: '2020/2021', first_day: '2020-10-31', last_day: '2021-05-01', days: 5, bare_days: 4, bare_days_wet_months: 2, rain_mm: 117.5, rain_on_bare_days_mm: 17.5, rain_wet_months_mm: 112.5 }]);
  });
  it('the same number of days on other dates gives another rain: the count alone does not carry the indicator', () => {
    const wet = exposureByYear(columns('2020/2021', [['2021-01-10', false, 40], ['2021-07-10', true, 0]]))[0];
    const dry = exposureByYear(columns('2020/2021', [['2021-01-10', true, 40], ['2021-07-10', false, 0]]))[0];
    expect([wet.bare_days, dry.bare_days]).toEqual([1, 1]);
    expect([wet.rain_on_bare_days_mm, dry.rain_on_bare_days_mm]).toEqual([40, 0]);
  });
  it('refuses columns it cannot read instead of counting them as zero', () => {
    const base: [string, boolean, number][] = [['2020-11-01', false, 1], ['2020-11-02', true, 2]];
    const broken = (change: (c: DailyColumns) => void) => { const c = columns('2020/2021', base); change(c); return () => exposureByYear(c); };
    expect(broken((c) => { c.rain_mm[0] = Number.NaN; })).toThrow(/field_shift_exposure_invalid/);
    expect(broken((c) => { c.rain_mm[0] = -1; })).toThrow(/field_shift_exposure_invalid/);
    expect(broken((c) => { (c.rain_mm as unknown[])[0] = null; })).toThrow(/field_shift_exposure_invalid/);
    expect(broken((c) => { (c.soil_covered as unknown[])[0] = 'no'; })).toThrow(/field_shift_exposure_invalid/);
    expect(broken((c) => { c.date[0] = '01/11/2020'; })).toThrow(/field_shift_exposure_invalid/);
    expect(broken((c) => { c.date[0] = '2021-02-31'; })).toThrow(/field_shift_exposure_invalid/); // not a day of the calendar
    expect(broken((c) => { c.rain_mm.pop(); })).toThrow(/field_shift_exposure_invalid/);
    expect(broken((c) => { delete (c as Record<string, unknown>).soil_covered; })).toThrow(/field_shift_exposure_invalid/);
    // A season that comes back after another one would be counted twice.
    const twice = columns('2020/2021', base); twice.agricultural_year = ['2020/2021', '2021/2022']; twice.date.push('2021-11-01'); twice.agricultural_year.push('2020/2021');
    twice.soil_covered.push(true); twice.rain_mm.push(0); twice.land_cover.push('soy'); twice.stage.push('x'); twice.storage_end_mm.push(0); twice.et_deficit_mm.push(0);
    expect(() => exposureByYear(twice)).toThrow(/field_shift_exposure_invalid/);
  });
});

describe('the pinned package', () => {
  it('its daily columns reproduce what its own summary publishes for every strategy and season', () => {
    const years = checkExposure(series, summary);
    for (const s of ['reference_fallow', 'brachiaria', 'soy_long_fallow'] as StrategyId[]) {
      expect(years[s].map((y) => y.agricultural_year)).toEqual(summary.weather.agricultural_years);
      years[s].forEach((y, i) => { const p = summary.scenarios[s].by_year[i]; expect(y.bare_days).toBe(p.bare_days); expect(y.days).toBe(p.year_days); expect(Math.abs(y.rain_mm - (p.year_rain_mm ?? 0))).toBeLessThanOrEqual(0.1); });
    }
  });
  it('historical rain: A and B have no such day from November to April, C has 93 a year; the rain on those days is 115, 76 and 1,032 mm', () => {
    const view = buildExposure({ series, summary }, summary, 'reference_fallow');
    const row = (m: string) => view.rows.find((r) => r.metric === m)!;
    expect(view.multiplier).toBe(1);
    // Means are kept unrounded and rounded once, on screen: 1032.348 is shown as 1,032.3, never as 1,032.4.
    expect(row('bare_days_wet_months').values.reference_fallow).toBe(0); expect(row('bare_days_wet_months').values.brachiaria).toBe(0);
    expect(row('bare_days_wet_months').values.soy_long_fallow).toBeCloseTo(93.3333, 4);
    expect(row('rain_on_bare_days_mm').values.reference_fallow).toBeCloseTo(114.8067, 4);
    expect(row('rain_on_bare_days_mm').values.brachiaria).toBeCloseTo(75.8833, 4);
    expect(row('rain_on_bare_days_mm').values.soy_long_fallow).toBeCloseTo(1032.3483, 4);
    expect(row('rain_on_bare_days_mm').deltas.reference_fallow).toBeNull();
    expect(row('rain_on_bare_days_mm').deltas.brachiaria).toMatchObject({ n: 6, mean: -38.92, min: -119.13, max: -2.15, status: 'ok' });
    expect(row('rain_on_bare_days_mm').deltas.soy_long_fallow).toMatchObject({ n: 6, mean: 917.54, min: 625.35, max: 1106.34 });
    expect(row('bare_days_wet_months').deltas.soy_long_fallow).toMatchObject({ n: 6, mean: 93.33, min: 93, max: 94 });
    expect(view.wetShare).toBeCloseTo(0.8486, 4); // share of the rain of the six seasons that fell from November to April
  });
  it('with C as the reference the same values are paired against C', () => {
    const view = buildExposure({ series, summary }, summary, 'soy_long_fallow');
    const rain = view.rows.find((r) => r.metric === 'rain_on_bare_days_mm')!;
    expect(rain.values).toEqual(buildExposure({ series, summary }, summary, 'reference_fallow').rows.find((r) => r.metric === 'rain_on_bare_days_mm')!.values);
    expect(rain.deltas.soy_long_fallow).toBeNull();
    expect(rain.deltas.reference_fallow).toMatchObject({ mean: -917.54, min: -1106.34, max: -625.35 });
    expect(rain.deltas.brachiaria).toMatchObject({ mean: -956.47, min: -1108.49, max: -744.48 });
  });
  it('rain −20% and +20%: the calendar is the same, so the rain on those days changes by the same factor', () => {
    const point = (m: number) => summary.sensitivity.rain.points.find((p) => p.multiplier === m)!;
    const minus = buildExposure({ series, summary }, point(0.8), 'reference_fallow'), plus = buildExposure({ series, summary }, point(1.2), 'reference_fallow');
    const rain = (v: typeof minus) => v.rows.find((r) => r.metric === 'rain_on_bare_days_mm')!, days = (v: typeof minus) => v.rows.find((r) => r.metric === 'bare_days_wet_months')!;
    expect(minus.multiplier).toBe(0.8);
    const base = rain(buildExposure({ series, summary }, summary, 'reference_fallow')).values;
    for (const s of ['reference_fallow', 'brachiaria', 'soy_long_fallow'] as StrategyId[]) { expect(rain(minus).values[s]).toBeCloseTo(0.8 * base[s], 9); expect(rain(plus).values[s]).toBeCloseTo(1.2 * base[s], 9); }
    expect(rain(minus).values.reference_fallow).toBeCloseTo(91.8453, 4); // shown as 91.8
    expect(rain(minus).deltas.soy_long_fallow).toMatchObject({ mean: 734.03, min: 500.28, max: 885.07 });
    expect(rain(plus).deltas.brachiaria).toMatchObject({ mean: -46.71, min: -142.96, max: -2.58 });
    expect(days(minus).values).toEqual(days(plus).values);
  });
});

describe('refusals: a series that does not reproduce the summary shows nothing', () => {
  it('one day flagged differently changes the count the summary publishes', () => {
    const other = clone(series); const c = other.scenarios.soy_long_fallow; const i = c.soil_covered.indexOf(false); c.soil_covered[i] = true;
    expect(() => checkExposure(other, summary)).toThrow(/field_shift_exposure_mismatch/);
  });
  it('a changed daily rain no longer adds up to the rain the summary publishes for the season', () => {
    const other = clone(series); const c = other.scenarios.reference_fallow; const i = c.rain_mm.findIndex((v) => v > 5); c.rain_mm[i] += 3;
    expect(() => checkExposure(other, summary)).toThrow(/field_shift_exposure_mismatch/);
  });
  it('a series calculated with another rain, another place or other seasons', () => {
    expect(() => checkExposure({ ...series, rain_multiplier: 1.2 }, summary)).toThrow(/field_shift_exposure_mismatch/);
    expect(() => checkExposure({ ...series, municipality_code: '3170206' }, summary)).toThrow(/field_shift_exposure_mismatch/);
    const short = clone(series); for (const s of Object.values(short.scenarios)) for (const k of Object.keys(s)) (s[k] as unknown[]).splice(0, 366);
    expect(() => checkExposure(short, summary)).toThrow(/field_shift_exposure_mismatch/);
  });
  it('a rain point whose calendar or rain is not the historical one times its factor', () => {
    const point = clone(summary.sensitivity.rain.points.find((p) => p.multiplier === 0.8)!);
    const moved = clone(point); moved.scenarios.brachiaria.by_year[2].bare_days = 20;
    expect(() => buildExposure({ series, summary }, moved, 'reference_fallow')).toThrow(/field_shift_exposure_mismatch/);
    const wetter = clone(point); wetter.scenarios.reference_fallow.by_year[0].year_rain_mm = 1500;
    expect(() => buildExposure({ series, summary }, wetter, 'reference_fallow')).toThrow(/field_shift_exposure_mismatch/);
    const odd = clone(point); odd.multiplier = Number.NaN;
    expect(() => buildExposure({ series, summary }, odd, 'reference_fallow')).toThrow(/field_shift_exposure_mismatch/);
  });
});

// Review finding: the season totals of the summary cannot tell where the days without cover and the rain fall.
// These are refused by what the columns say about themselves: one weather for the three strategies, a cover flag that
// agrees with the land cover of the day, consecutive days and seasons that start and end at the published sowings.
describe('refusals the season totals alone would let through', () => {
  const day = (c: DailyColumns, date: string) => c.date.indexOf(date);
  it('the same number of days without cover, on other days', () => {
    const other = clone(series); const c = other.scenarios.soy_long_fallow;
    expect(c.soil_covered[day(c, '2018-03-27')]).toBe(false); expect(c.soil_covered[day(c, '2017-10-09')]).toBe(true);
    c.soil_covered[day(c, '2018-03-27')] = true; c.soil_covered[day(c, '2017-10-09')] = false; // same count in 2017/2018
    expect(exposureByYear(c)[2].bare_days).toBe(exposureByYear(series.scenarios.soy_long_fallow)[2].bare_days);
    expect(() => checkExposure(other, summary)).toThrow(/field_shift_exposure_mismatch/);
  });
  it('rain moved to another day of the same season in one strategy', () => {
    const other = clone(series); const c = other.scenarios.reference_fallow; const from = day(c, '2020-01-22'), to = day(c, '2020-05-27');
    c.rain_mm[to] += c.rain_mm[from]; c.rain_mm[from] = 0; // the season total is unchanged
    expect(() => checkExposure(other, summary)).toThrow(/field_shift_exposure_mismatch/);
  });
  it('a day repeated or skipped, and a season that does not start at the published soy sowing', () => {
    const repeated = clone(series); for (const s of Object.values(repeated.scenarios)) s.date[10] = s.date[9];
    expect(() => checkExposure(repeated, summary)).toThrow(/field_shift_exposure_mismatch/);
    const moved = clone(series); for (const s of Object.values(moved.scenarios)) { const first = s.agricultural_year.indexOf('2016/2017'); s.agricultural_year[first] = '2015/2016'; }
    expect(() => checkExposure(moved, summary)).toThrow(/field_shift_exposure_mismatch/);
  });
});
