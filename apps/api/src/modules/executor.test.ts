import { it, expect, vi } from 'vitest';
import { LiveExecutor } from './analysis/executor.js';
it('preserves a scientific adapter contract failure as 502 without exposing its private error details', async () => {
  vi.stubGlobal('fetch', async()=>new Response(JSON.stringify({error:{code:'upstream_invalid',message:'private artifact path and provider secret'}}),{status:502}));
  try { await expect(new LiveExecutor('http://internal.test','test-token').execute('yield_estimate',{}, {requestId:'contract-test'})).rejects.toMatchObject({status:502,code:'upstream_invalid'}); }
  finally {vi.unstubAllGlobals();}
});
