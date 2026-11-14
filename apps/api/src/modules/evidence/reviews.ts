import { contextKey, canonicalJson, validators } from '@gaiapus/contracts';
import { examples, publication } from '@gaiapus/contracts/fixtures';
import { privateResult, type PrivateRequest } from '../account/personal.js';
import { ApiError } from '../../plugins/errors.js';
export function validatePublishedContext(key: string, version?: string) {
  const invalid = () => new ApiError(422, 'invalid_publication_context', 'Context and version must refer to published evidence');
  if (version !== undefined && version !== publication.publication_version) throw invalid();
  try {
    const colon = key.indexOf(':'); const kind = key.slice(0, colon); const parameters = JSON.parse(key.slice(colon + 1));
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters) || contextKey(kind, parameters) !== key) throw invalid();
    if (kind === 'example') {
      if (Object.keys(parameters).length !== 1 || !examples.some(x => x.example_id === parameters.example_id)) throw invalid();
    } else if (kind === 'coverage' || kind === 'observations') {
      if (!validators[kind === 'coverage' ? 'CoverageQuery' : 'ObservationsQuery']!(parameters)) throw invalid();
      const validated = parameters as Record<string, any>;
      if (!publication.areas.some(x => x.area_id === validated.area_id)) throw invalid();
      if (kind === 'observations' && validated.start > validated.end) throw invalid();
    } else if (kind === 'yield_estimate' || kind === 'water_risk_projection') {
      if (!examples.some(x => x.product_id === kind && canonicalJson(x.input_snapshot) === canonicalJson(parameters))) throw invalid();
    } else throw invalid();
  } catch { throw invalid(); }
}
export function reviewHandlers() {
  return {
    'GET /v1/evidence-views': async (request: PrivateRequest) => {
      const key = (request.query as { context_key: string }).context_key; validatePublishedContext(key);
      return privateResult(request, await request.repository.review(key));
    },
    'POST /v1/evidence-views': async (request: PrivateRequest) => {
      const input = request.body as { context_key: string; publication_version: string };
      validatePublishedContext(input.context_key, input.publication_version);
      return privateResult(request, await request.repository.recordReview(input.context_key, input.publication_version));
    },
  };
}
