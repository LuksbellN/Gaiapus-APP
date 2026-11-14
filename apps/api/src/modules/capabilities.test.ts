import { it, expect } from 'vitest';
import { createApp } from '../app.js';
import { testDependencies, authA } from '../../tests/helpers.js';
import { examples } from '@gaiapus/contracts/fixtures';
import { loadLiveCapabilities } from './analysis/capabilities.js';
import { vi } from 'vitest';
it('keeps published examples readable while disabling a live product with missing artifacts', async () => {
  let calls = 0;
  const app = createApp({ ...testDependencies(), capabilities: { yield_estimate: { ready: false, reason_code: 'missing_artifacts', supported_inputs: [] }, water_risk_projection: { ready: true, reason_code: null, supported_inputs: [examples.find(x => x.product_id === 'water_risk_projection')!.input_snapshot] } }, executor: { origin: 'live', async execute() { calls++; return examples[0]!.result.data; } } });
  const result = (await app.inject('/v1/coverage?area_id=5107925')).json();
  const yieldProduct = result.data.products.find((x: any) => x.product_id === 'yield_estimate');
  expect(yieldProduct.availability).toBe('available'); expect(yieldProduct.run_available).toBe(false); expect(yieldProduct.reason_code).toBe('missing_artifacts'); expect(yieldProduct.execution_origin).toBe('live');
  expect(result.data.products.find((x: any) => x.product_id === 'water_risk_projection').run_available).toBe(true);
  expect((await app.inject(`/v1/examples/${examples[0]!.example_id}`)).statusCode).toBe(200);
  const run = await app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: examples[0]!.input_snapshot });
  expect(run.statusCode).toBe(503); expect(calls).toBe(0); await app.close();
});
it('advertises and admits only adapter-reproduced input tuples, and recovers after startup unavailability', async () => {
  let ready = false; let fetches = 0; let now = 0;
  vi.stubGlobal('fetch', async () => {
    fetches++;
    return ready ? new Response(JSON.stringify({ source_revision: 'ecae8c4457c0bd152915ea16495c83ad5097cfd4', products: { yield_estimate: { ready: true, supported_inputs: [examples[0]!.input_snapshot] } } }), { status: 200 }) : new Response('{}', { status: 503 });
  });
  const app = createApp({ ...testDependencies(), capabilities: undefined, capabilitiesProvider: () => loadLiveCapabilities('http://internal.test', 'test-token'), now: () => now, executor: { origin: 'live', async execute() { return examples[0]!.result.data; } } });
  try {
    const first = (await app.inject('/v1/coverage?area_id=5107925')).json(); expect(first.data.products.find((x: any) => x.product_id === 'yield_estimate').run_available).toBe(false);
    ready = true; now = 6000;
    const recovered = (await app.inject('/v1/coverage?area_id=5107925')).json();
    const capability = recovered.data.products.find((x: any) => x.product_id === 'yield_estimate');
    expect(capability.run_available).toBe(true); expect(capability.supported_inputs.map((x: any) => x.input)).toEqual([examples[0]!.input_snapshot]);
    const elsewhere = (await app.inject('/v1/coverage?area_id=3170206')).json(); expect(elsewhere.data.products.find((x: any) => x.product_id === 'yield_estimate').run_available).toBe(false);
    const unmatched = await app.inject({ method: 'POST', url: '/v1/yield-estimates', headers: authA, payload: examples.find(x => x.area_id === '3170206')!.input_snapshot }); expect(unmatched.statusCode).toBe(422);
    expect(fetches).toBe(2);
  } finally { vi.unstubAllGlobals(); await app.close(); }
});
