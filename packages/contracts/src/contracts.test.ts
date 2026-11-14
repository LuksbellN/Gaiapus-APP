import { describe, it, expect } from 'vitest';
import { validators, validateScientific } from './index.js';
import { examples, fixtures } from './fixtures.js';

describe('canonical application and scientific contracts', () => {
  it('validates every published example unchanged', () => {
    expect(examples).toHaveLength(4);
    for (const example of examples) expect(validateScientific(example.result.data), example.example_id).toBe(true);
  });
  it('rejects a numeric estimate before the first cutoff', () => {
    const sample = structuredClone(examples.find(x => x.example_id === 'yield-soy-3170206-day20')!.result.data);
    expect(validateScientific({ ...sample, estimate_kg_ha: 100 })).toBe(false);
  });
  it('rejects malformed scientific dates, extra properties, and invented yield effects', () => {
    const yieldResult = examples[0]!.result.data;
    expect(validateScientific({ ...yieldResult, sowing_date: '2021-02-30' })).toBe(false);
    expect(validateScientific({ ...yieldResult, recommendation: 'plant' })).toBe(false);
    const water = examples.find(x => x.product_id === 'water_risk_projection')!.result.data;
    expect(validateScientific({ ...water, yield_effect: 25 })).toBe(false);
  });
  it('validates all exported application fixtures', () => {
    for (const fixture of fixtures) expect(validators[fixture.schema](fixture.value), fixture.schema + JSON.stringify(validators[fixture.schema].errors)).toBe(true);
  });
});
