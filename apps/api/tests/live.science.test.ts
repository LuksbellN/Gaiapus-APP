import { it, expect } from 'vitest';
import { createApp } from '../src/app.js';
import { LiveExecutor } from '../src/modules/analysis/executor.js';
import { loadLiveCapabilities } from '../src/modules/analysis/capabilities.js';
import { testDependencies, authA } from './helpers.js';
import { examples } from '@gaiapus/contracts/fixtures';
import { validateScientific } from '@gaiapus/contracts';
it('connects Node to real CPU v7 inference, preserves national scope, and saves/reopens its original output', async () => {
  const url=process.env.SCIENCE_TEST_URL,token=process.env.SCIENCE_TEST_TOKEN;
  expect(url,'Set SCIENCE_TEST_URL and SCIENCE_TEST_TOKEN for the running internal adapter').toBeTruthy(); expect(token).toBeTruthy();
  const app=createApp({...testDependencies(),capabilities:undefined,capabilitiesProvider:()=>loadLiveCapabilities(url!,token!),executor:new LiveExecutor(url!,token!,130000)});
  try {
    const coverage=await app.inject('/v1/coverage?area_id=5107925');
    expect(coverage.json().data.products.find((x:any)=>x.product_id==='yield_estimate').run_available).toBe(true);
    expect(coverage.json().data.products.find((x:any)=>x.product_id==='water_risk_projection').run_available).toBe(false);
    for(const example of examples.filter(x=>x.product_id==='yield_estimate')) {
      const response=await app.inject({method:'POST',url:'/v1/yield-estimates',headers:authA,payload:example.input_snapshot});
      expect(response.statusCode, response.body).toBe(200);expect(validateScientific(response.json().data)).toBe(true);
      expect(response.json().meta.execution_origin).toBe('live');expect(response.json().data.model.version).toBe('research_v7_national_walk_forward');
      const expected=example.result.data as any;
      expect(response.json().data.estimate_kg_ha).toBe(expected.estimate_kg_ha);
      const saved=await app.inject({method:'POST',url:'/v1/comparisons',headers:{...authA,'Idempotency-Key':`live-${example.example_id}`},payload:{source:{kind:'analysis',save_handle_id:response.json().meta.save_handle.id},title:example.title}});
      expect(saved.statusCode,saved.body).toBe(200);
      const reopened=await app.inject({url:`/v1/comparisons/${saved.json().data.id}`,headers:authA});
      expect(reopened.json().data.output_envelope.data).toEqual(response.json().data);
      expect(reopened.json().data.output_envelope.meta.save_handle).toBeUndefined();
    }
  } finally {await app.close();}
},30000);
