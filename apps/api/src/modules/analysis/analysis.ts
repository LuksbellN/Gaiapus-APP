import type { FastifyReply } from 'fastify';
import { canonicalJson, contextKey, validateScientific } from '@gaiapus/contracts';
import { examples, publication } from '@gaiapus/contracts/fixtures';
import type { ScientificEnvelope, YieldPayload, WaterRiskPayload } from '@gaiapus/contracts';
import type { PrivateRequest } from '../account/personal.js';
import { areaById } from '../geography/public.js';
import { ApiError } from '../../plugins/errors.js';
import { FixtureExecutor, type ScientificExecutor } from './executor.js';
import { ResultHandleStore } from '../comparisons/handles.js';
import type { Capabilities } from './capabilities.js';
const safeFailure = () => new ApiError(502, 'upstream_invalid', 'Scientific response failed validation');
export function validateResultForInput(output: unknown, product: string, input: Record<string, any>): asserts output is YieldPayload | WaterRiskPayload {
  if (!validateScientific(output)) throw safeFailure();
  const result = output as YieldPayload | WaterRiskPayload;
  if (result.product !== product || result.municipality_code !== input.municipality_code || result.crop !== input.crop) throw safeFailure();
  if (result.product === 'yield_estimate') {
    const approved=examples.find(x=>x.product_id==='yield_estimate'&&canonicalJson(x.input_snapshot)===canonicalJson(input))?.result.data as YieldPayload|undefined;
    if(!approved||result.sowing_date!==approved.sowing_date||canonicalJson(result.model)!==canonicalJson(approved.model)||canonicalJson(result.supported_cutoffs_days)!==canonicalJson(approved.supported_cutoffs_days)) throw safeFailure();
    const eligible = result.supported_cutoffs_days.filter(x => x <= input.days_after_sowing).sort((a, b) => a - b);
    if (result.harvest_year !== input.harvest_year || result.days_after_sowing_requested !== input.days_after_sowing || result.cutoff_days_used !== (eligible.at(-1) ?? null)) throw safeFailure();
    if (result.status === 'ready' && (result.validation?.cutoff_days !== result.cutoff_days_used || result.coverage.forcing_days_present < result.coverage.forcing_days_expected)) throw safeFailure();
    if (result.status !== (eligible.length ? 'ready' : 'before_first_cutoff') || result.model.trained_through_harvest > input.harvest_year - 2) throw safeFailure();
    if (result.observed_through && result.cutoff_days_used !== null) {
      const maxDate = new Date(`${result.sowing_date}T00:00:00Z`); maxDate.setUTCDate(maxDate.getUTCDate() + result.cutoff_days_used - 1);
      if (result.observed_through > maxDate.toISOString().slice(0, 10)) throw safeFailure();
    }
  } else {
    if (result.sowing_date !== input.sowing_date || Date.parse(result.decision_at) !== Date.parse(input.decision_at) || result.horizon_days_requested !== input.horizon_days || result.days.length !== result.horizon_days_served || result.days.length > input.horizon_days) throw safeFailure();
    const decisionInstant = Date.parse(input.decision_at);
    const decision = Date.parse(new Date(decisionInstant).toISOString().slice(0, 10) + 'T00:00:00Z');
    const cropDay = (decision - Date.parse(`${result.sowing_date}T00:00:00Z`)) / 86400000;
    if (result.crop_day_at_decision !== cropDay || cropDay < 0) throw safeFailure();
    const served = result.days.length;
    const expectedStatus = served === 0 ? 'not_supported' : result.days.every(day => day.validated_lead) ? 'ready' : 'partially_validated';
    if (result.status !== expectedStatus || result.max_validated_lead_days < 0) throw safeFailure();
    const { issued_at, available_at, retrieved_at } = result.forecast;
    if (!issued_at || !available_at || Date.parse(issued_at) > Date.parse(available_at) || Date.parse(available_at) > decisionInstant || Date.parse(retrieved_at) < Date.parse(available_at) || Date.parse(result.generated_at) < Date.parse(retrieved_at)) throw safeFailure();
    const evaluated = result.evaluation.by_lead.filter(day => day.lead_days <= result.max_validated_lead_days);
    if (evaluated.length !== result.max_validated_lead_days || evaluated.some((day, i) => day.lead_days !== i + 1 || !day.passed)) throw safeFailure();
    if ((served > 0) !== (result.initial_state !== null)) throw safeFailure();
    if (result.initial_state && (result.initial_state.date !== new Date(decision - 86400000).toISOString().slice(0, 10) || result.initial_state.observed_days !== cropDay)) throw safeFailure();
    if (result.reference_days.length && result.reference_days.length !== served) throw safeFailure();
    for (const [index, day] of result.days.entries()) {
      const expectedDate = new Date(decision + index * 86400000).toISOString().slice(0, 10);
      if (day.lead_days !== index + 1 || day.date !== expectedDate || day.crop_day !== cropDay + index || day.validated_lead !== (day.lead_days <= result.max_validated_lead_days)) throw safeFailure();
      const reference = result.reference_days[index];
      if (reference && (reference.date !== day.date || reference.lead_days !== day.lead_days || reference.crop_day !== day.crop_day || reference.validated_lead !== day.validated_lead)) throw safeFailure();
    }
  }
}
export function analysisHandlers(options: { executor?: ScientificExecutor; handles: ResultHandleStore; now?: () => number; capabilities?: Capabilities }) {
  const executor = options.executor ?? new FixtureExecutor(); const now = options.now ?? Date.now;
  const active = new Set<string>(); const limits = new Map<string, { count: number; reset: number }>();
  const analyze = async (request: PrivateRequest, reply: FastifyReply, product: 'yield_estimate' | 'water_risk_projection') => {
    const input = request.body as Record<string, any>; areaById(input.municipality_code);
    const exactExample = examples.find(x => x.product_id === product && canonicalJson(x.input_snapshot) === canonicalJson(input));
    if (!exactExample) throw new ApiError(422, executor.origin === 'fixture' ? 'fixture_not_available' : 'unsupported_input', 'Inputs are not in the published supported request catalog');
    if (executor.origin === 'live') {
      const capability = options.capabilities?.[product];
      if (!capability?.ready) throw new ApiError(503, capability?.reason_code ?? 'missing_artifacts', 'Scientific capability is not ready');
      if (!capability.supported_inputs.some(allowed => canonicalJson(allowed) === canonicalJson(input))) throw new ApiError(422, 'unsupported_input', 'This input has not been reproduced by the scientific adapter');
    }
    const user = request.identity.id;
    if (active.has(user)) throw new ApiError(503, 'dependency_busy', 'An analysis is already running for this user');
    for (const [key, value] of limits) if (value.reset <= now()) limits.delete(key);
    const limit = limits.get(user) ?? { count: 0, reset: now() + 600000 };
    if (limit.count >= 10) { reply.header('Retry-After', Math.max(1, Math.ceil((limit.reset - now()) / 1000))); throw new ApiError(429, 'rate_limited', 'Scientific request limit reached'); }
    if (limits.size >= 10000 && !limits.has(user)) throw new ApiError(503, 'dependency_busy', 'Scientific capacity unavailable');
    limit.count++; limits.set(user, limit); active.add(user);
    try {
      let output: unknown;
      try { output = await executor.execute(product, input, { requestId: request.id }); }
      catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(503, 'dependency_failure', 'Scientific service unavailable'); }
      validateResultForInput(output, product, input);
      const envelope = { data: output, meta: { app_contract_version: '0.1.0', request_id: request.id, context_key: contextKey(product, input), execution_origin: executor.origin, result_basis: product === 'yield_estimate' ? 'retrospective_estimate' : 'forecast_projection', publication_version: publication.publication_version } } as ScientificEnvelope;
      const handle = options.handles.create(user, { area_id: input.municipality_code, product_id: product, result_basis: envelope.meta.result_basis, input_snapshot: structuredClone(exactExample.input_snapshot), output_envelope: structuredClone(envelope), source_versions: { scientific_revision: publication.scientific_revision, publication_version: publication.publication_version, app_contract_version: '0.1.0' } });
      envelope.meta.save_handle = handle; return envelope;
    } finally { active.delete(user); }
  };
  return { 'POST /v1/yield-estimates': (request: PrivateRequest, reply: FastifyReply) => analyze(request, reply, 'yield_estimate'), 'POST /v1/water-balance/scenarios': (request: PrivateRequest, reply: FastifyReply) => analyze(request, reply, 'water_risk_projection') };
}
