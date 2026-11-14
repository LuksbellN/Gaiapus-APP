import { canonicalJson } from '@gaiapus/contracts';
import { examples } from '@gaiapus/contracts/fixtures';
import { ApiError } from '../../plugins/errors.js';
export interface ScientificExecutor {
  origin: 'fixture' | 'live';
  execute(product: 'yield_estimate' | 'water_risk_projection', input: Record<string, unknown>, context: { requestId: string }): Promise<unknown>;
}
export class FixtureExecutor implements ScientificExecutor {
  readonly origin = 'fixture';
  async execute(product: string, input: Record<string, unknown>) {
    const example = examples.find(x => x.product_id === product && canonicalJson(x.input_snapshot) === canonicalJson(input));
    if (!example) throw new ApiError(422, 'fixture_not_available', 'No published fixture matches these inputs');
    return structuredClone(example.result.data);
  }
}
export class LiveExecutor implements ScientificExecutor {
  readonly origin = 'live';
  constructor(private baseUrl: string, private internalToken: string, private deadlineMs = 130_000) {}
  async execute(product: 'yield_estimate' | 'water_risk_projection', input: Record<string, unknown>, context: { requestId: string }) {
    const path = product === 'yield_estimate' ? '/yield-estimates' : '/water-balance/scenarios';
    let response: Response;
    try {
      response = await fetch(new URL(path, this.baseUrl), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Request-Id': context.requestId, Authorization: `Bearer ${this.internalToken}` }, body: JSON.stringify(input), signal: AbortSignal.timeout(this.deadlineMs) });
    } catch (error) { throw new ApiError(503, (error as Error).name === 'TimeoutError' ? 'dependency_timeout' : 'dependency_failure', 'Scientific service unavailable'); }
    if (!response.ok) {
      if (response.status === 422) throw new ApiError(422, 'unsupported_input', 'Scientific input is unavailable');
      if (response.status === 502) throw new ApiError(502,'upstream_invalid','Scientific response failed validation');
      let code='dependency_failure';
      try {
        const body=await response.json() as {error?:{code?:string}};
        if(['dependency_busy','missing_artifacts','incomplete_forcing'].includes(body.error?.code??'')) code=body.error!.code!;
      } catch { /* Provider messages and bodies stay outside the public error contract. */ }
      throw new ApiError(response.status >= 500 || response.status === 429 ? 503 : 502, code, 'Scientific service unavailable');
    }
    try { return await response.json(); } catch { throw new ApiError(502, 'upstream_invalid', 'Scientific response failed validation'); }
  }
}
