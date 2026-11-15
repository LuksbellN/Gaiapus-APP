// Bare soil extension: shown only when its calendar is the v2 package's; values and pairing come straight from the file.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import type { FieldShiftSummary } from './field-shift-decision';
import { bareSoilView, checkBareSoil, type BareSoilExtension } from './field-shift-bare-soil';

const read = <T,>(...p: string[]) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'teammate', 'data', ...p), 'utf8')) as T;
const ext = read<BareSoilExtension>('sorriso-field-shift-rotations.json');
const summary = read<FieldShiftSummary>('field-shift-v2', 'summary.json');

it('accepts the committed extension against the pinned v2 package', () => {
  expect(() => checkBareSoil(ext, summary)).not.toThrow();
});

it('refuses an extension whose covered days differ from the package in one season', () => {
  const broken = structuredClone(ext); broken.scenarios.soy_fallow.by_year[2].covered_days! += 1;
  expect(() => checkBareSoil(broken, summary)).toThrow(/field_shift_bare_soil_mismatch: soy_long_fallow/);
  const other = structuredClone(ext); other.municipality_code = '3170206';
  expect(() => checkBareSoil(other, summary)).toThrow(/another product or place/);
});

it('reads means and pairs C − A and B − A season by season', () => {
  const view = bareSoilView(ext);
  const rain = view.rows.find((r) => r.metric === 'rain_on_bare_soil_mm')!;
  expect(rain.values).toEqual({ reference_fallow: ext.scenarios.reference_fallow.mean.rain_on_bare_soil_mm, brachiaria: ext.scenarios.brachiaria.mean.rain_on_bare_soil_mm, soy_long_fallow: ext.scenarios.soy_fallow.mean.rain_on_bare_soil_mm });
  const rainy = view.rows.find((r) => r.metric === 'bare_days_nov_apr')!;
  expect(rainy.values.reference_fallow).toBe(0);
  expect(rainy.deltas.soy_long_fallow.n).toBe(6);
  expect(rainy.deltas.soy_long_fallow.mean).toBeCloseTo(ext.scenarios.soy_fallow.mean.bare_days_nov_apr! - ext.scenarios.reference_fallow.mean.bare_days_nov_apr!, 1);
});

it('keeps the published ±20% rows (against A only) and a missing value as null', () => {
  const view = bareSoilView(ext);
  expect(view.sensitivity.map((r) => `${r.percent} ${r.alt}`)).toEqual(['-20 brachiaria', '-20 soy_long_fallow', '20 brachiaria', '20 soy_long_fallow']);
  const published = ext.delta_change_sensitivity.rows.find((r) => r.value === 0.8 && r.comparison === 'soy_fallow_minus_reference_fallow')!;
  expect(view.sensitivity[1].values.rain_on_bare_soil_mm).toBe(published.difference_rain_on_bare_soil_mm);
  const gap = structuredClone(ext); delete gap.delta_change_sensitivity.rows[0].difference_bare_days_nov_apr;
  expect(bareSoilView(gap).sensitivity[0].values.bare_days_nov_apr).toBeNull();
});
