import { describe, it, expect } from 'vitest';
import { createApp } from '../app.js';
import { testDependencies, authA } from '../../tests/helpers.js';
import { examples } from '@gaiapus/contracts/fixtures';
import { validators } from '@gaiapus/contracts';
import { ApiError } from '../plugins/errors.js';
const soy = examples.find(x => x.example_id === 'yield-soy-5107925-day75')!;
const early = examples.find(x => x.example_id === 'yield-soy-3170206-day20')!;
const water = examples.find(x => x.product_id === 'water_risk_projection')!;
describe('authenticated scientific boundary', () => {
  it('rejects anonymous requests before scientific execution', async () => {
    let called = false;
    const app = createApp({ ...testDependencies(), executor: { origin: 'live', async execute() { called = true; throw new Error('must not run'); } } });
    const response = await app.inject({ method: 'POST', url: '/v1/yield-estimates', payload: soy.input_snapshot });
    expect(response.statusCode).toBe(401); expect(called).toBe(false); await app.close();
  });
  it('returns the exact retrospective fixture with an owned expiring handle', async () => {
    const app = createApp(testDependencies());
    const response = await app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: soy.input_snapshot });
    expect(response.statusCode).toBe(200); expect(response.json().data).toEqual(soy.result.data);
    expect(validators.YieldEstimateResponse!(response.json())).toBe(true);
    expect(response.json().meta.execution_origin).toBe('fixture'); expect(response.json().meta.result_basis).toBe('retrospective_estimate');
    expect(response.json().meta.save_handle.id).toMatch(/^[a-f0-9-]{36}$/); await app.close();
  });
  it('preserves before-first-cutoff and the actual truncated six-day N10 publication', async () => {
    const app = createApp(testDependencies());
    const before = await app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: early.input_snapshot });
    expect(before.statusCode).toBe(200); expect(before.json().data.status).toBe('before_first_cutoff'); expect(before.json().data.estimate_kg_ha).toBeNull();
    const result = await app.inject({ method: 'POST', url: '/v1/water-balance/scenarios', headers: authA, payload: water.input_snapshot });
    expect(result.statusCode).toBe(200); expect(result.json().data.status).toBe('ready');
    expect(result.json().data.horizon_days_requested).toBe(10); expect(result.json().data.horizon_days_served).toBe(6);
    expect(result.json().data.days.filter((x: any) => x.validated_lead)).toHaveLength(6); expect(result.json().data.yield_effect).toBeNull();
    expect(result.json().data.warnings).toContain('Served 6 of 10 days: forecast or crop cycle ends earlier'); await app.close();
  });
  it('rejects unsupported and malformed tuples before invoking an executor', async () => {
    let calls = 0;
    const app = createApp({ ...testDependencies(), executor: { origin: 'fixture', async execute() { calls++; return soy.result.data; } } });
    for (const payload of [{ ...soy.input_snapshot, crop: 'rice' }, { ...soy.input_snapshot, municipality_code: 5107925 }, { ...soy.input_snapshot, days_after_sowing: 76 }, { ...soy.input_snapshot, harvest_year: 2026 }, { ...soy.input_snapshot, latitude: -12 }]) {
      expect((await app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload })).statusCode).toBe(422);
    }
    expect(calls).toBe(0); await app.close();
  });
  it('maps live dependency failure without substituting a fixture', async () => {
    const app = createApp({ ...testDependencies(), executor: { origin: 'live', async execute() { throw new ApiError(503, 'dependency_failure', 'Unavailable'); } } });
    const response = await app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: soy.input_snapshot });
    expect(response.statusCode).toBe(503); expect(response.json().data).toBeUndefined(); await app.close();
  });
  it('rejects malformed upstream output and a schema-valid result for a different input', async () => {
    for (const output of [{ ...soy.result.data, estimate_kg_ha: -1 }, { ...soy.result.data, municipality_code: '3170206' }, { ...soy.result.data, cutoff_days_used: 90 }, {...soy.result.data, model:{...(soy.result.data as any).model,version:'different-unpublished-model'}}]) {
      const app = createApp({ ...testDependencies(), executor: { origin: 'live', async execute() { return output; } } });
      const response = await app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: soy.input_snapshot });
      expect(response.statusCode).toBe(502); await app.close();
    }
  });
  it('rejects contradictory water status, future issue times, crop days and misaligned reference dates', async () => {
    const original = water.result.data as any;
    for (const output of [
      { ...original, status: 'ready', max_validated_lead_days: 0, days: original.days.map((x: any) => ({ ...x, validated_lead: false })) },
      { ...original, forecast: { ...original.forecast, issued_at: '2099-01-01T00:00:00Z', available_at: '2099-01-01T01:00:00Z' } },
      { ...original, reference_days: original.reference_days.map((x: any) => ({ ...x, date: '2099-01-01' })) },
      { ...original, crop_day_at_decision: 9000 },
      { ...original, status: 'not_supported' },
    ]) {
      const app = createApp({ ...testDependencies(), executor: { origin: 'live', async execute() { return output; } } });
      expect((await app.inject({ method: 'POST', url: '/v1/water-balance/scenarios', headers: authA, payload: water.input_snapshot })).statusCode).toBe(502); await app.close();
    }
  });
  it('bounds concurrent execution per user, and throttles the eleventh request', async () => {
    let finish!: (value: unknown) => void;
    const blocked = new Promise(resolve => { finish = resolve; });
    let enter!: () => void; const entered = new Promise<void>(resolve => { enter = resolve; });
    const app = createApp({ ...testDependencies(), executor: { origin: 'live', execute: async () => { enter(); return blocked; } } });
    const pending = app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: soy.input_snapshot });
    await entered;
    const busy = await app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: soy.input_snapshot });
    expect(busy.statusCode).toBe(503); expect(busy.json().error.code).toBe('dependency_busy');
    finish(soy.result.data); await pending; await app.close();
    const limited = createApp(testDependencies());
    for (let n = 0; n < 10; n++) expect((await limited.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: soy.input_snapshot })).statusCode).toBe(200);
    const response = await limited.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: soy.input_snapshot });
    expect(response.statusCode).toBe(429); expect(response.headers['retry-after']).toBeDefined(); await limited.close();
  });
});
