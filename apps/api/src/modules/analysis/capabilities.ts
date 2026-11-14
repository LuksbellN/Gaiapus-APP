import { publication } from '@gaiapus/contracts/fixtures';
import { canonicalJson, validators } from '@gaiapus/contracts';
import { examples } from '@gaiapus/contracts/fixtures';
import type { ReasonCode } from '@gaiapus/contracts';
export type ProductReadiness = { ready: boolean; reason_code: ReasonCode | null; supported_inputs: unknown[] };
export type Capabilities = Partial<Record<'yield_estimate' | 'water_risk_projection', ProductReadiness>>;
export async function loadLiveCapabilities(baseUrl: string, internalToken: string): Promise<Capabilities> {
  const unavailable: Capabilities = { yield_estimate: { ready: false, reason_code: 'missing_artifacts', supported_inputs: [] }, water_risk_projection: { ready: false, reason_code: 'incomplete_forcing', supported_inputs: [] } };
  try {
    const response = await fetch(new URL('/health', baseUrl), { headers: { Authorization: `Bearer ${internalToken}` }, signal: AbortSignal.timeout(2000) });
    if (!response.ok) return unavailable;
    const health = await response.json() as Record<string, any>;
    if (health.source_revision !== publication.scientific_revision) return unavailable;
    for (const product of ['yield_estimate', 'water_risk_projection'] as const) {
      const reported = health.products?.[product];
      const allowed = Array.isArray(reported?.supported_inputs) ? reported.supported_inputs.filter((input: unknown) => validators[product === 'yield_estimate' ? 'YieldEstimateRequest' : 'WaterRiskProjectionRequest']!(input) && examples.some(x => x.product_id === product && canonicalJson(x.input_snapshot) === canonicalJson(input))) : [];
      const ready = reported?.ready === true && allowed.length > 0;
      unavailable[product] = { ready, reason_code: ready ? null : product === 'yield_estimate' ? 'missing_artifacts' : 'incomplete_forcing', supported_inputs: ready ? allowed : [] };
    }
  } catch { /* Public evidence remains available when the independent service is absent. */ }
  return unavailable;
}
