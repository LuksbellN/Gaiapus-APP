import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { publishedCoverage, publishedObservations } from './publication.js';
import pin from '../upstream/pin.json' with { type: 'json' };
import v7Pin from '../upstream/v7/pin.json' with { type: 'json' };
import { olderSavedComparison, savedComparison } from './fixtures.js';
import { validators, validateScientific } from './index.js';
import { examples, fixtures } from './fixtures.js';

describe('canonical application and scientific contracts', () => {
  it('validates every published example unchanged', () => {
    expect(examples).toHaveLength(5);
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
  it('keeps the pinned scientific schemas and examples byte-for-byte unchanged', () => {
    for (const [path, expected] of Object.entries(pin.files)) {
      if (!path.startsWith('contracts/')) continue;
      const bytes = readFileSync(new URL(`../upstream/${path.slice('contracts/'.length)}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex'), path).toBe(expected);
    }
  });
  it('validates the actual public coverage/history fixture builders and absent products', () => {
    for (const areaId of ['5107925', '3170206', 'BR', 'published-field-uberlandia', 'published-field-rio-verde', 'published-field-barreiras']) {
      expect(validators.CoverageResult!(publishedCoverage(areaId))).toBe(true);
      expect(validators.ObservationsResult!(publishedObservations(areaId, '2024-04-01', '2024-07-31'))).toBe(true);
    }
  });
  it('retains untouched v7 schema/example provenance and valid older v6 snapshots', () => {
    for(const [path,expected] of Object.entries(v7Pin.files)) {
      if(!path.startsWith('contracts/')) continue;
      const bytes=readFileSync(new URL(`../upstream/v7/${path}`,import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex'),path).toBe(expected);
    }
    expect(validators.ComparisonDetail!(olderSavedComparison)).toBe(true);
    expect(olderSavedComparison.source_versions.publication_version).not.toBe(savedComparison.source_versions.publication_version);
    expect((olderSavedComparison.output_envelope.data as any).model.version).toBe('research_v6_walk_forward');
    expect((savedComparison.output_envelope.data as any).model.version).toBe('research_v7_national_walk_forward');
  });
});
