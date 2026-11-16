// simulation-technical-report.v1: an additive contract next to the simulation contracts. Requests carry ids, scope,
// locale and display profile only; scientific artifact kinds and existing routes are unchanged.
import { describe, expect, it } from 'vitest';
import { schemas, validators } from './index.js';
import { routeContracts } from './generated/routes.js';

const ok = (name: string, value: unknown) => expect(validators[name]!(value), `${name}: ${JSON.stringify(validators[name]!.errors?.slice(0, 3))}`).toBe(true);
const bad = (name: string, value: unknown) => expect(validators[name]!(value), name).toBe(false);

describe('technical report contract', () => {
  it('adds the two report routes without touching the four simulation routes or the artifact kinds', () => {
    const routes = routeContracts.map(r => `${r[0]} ${r[1]}`);
    expect(routes.filter(r => r.includes('/v1/simulations'))).toEqual(['GET /v1/simulations/capabilities', 'GET /v1/simulations/regional', 'GET /v1/simulations/:id',
      'GET /v1/simulations/:id/series', 'POST /v1/simulations/:id/report', 'GET /v1/simulations/:id/report']);
    expect(routeContracts.find(r => r[0] === 'GET' && r[1] === '/v1/simulations/:id/report')).toEqual(['GET', '/v1/simulations/:id/report', null, 'SimulationIdParams', 'ReportGenerationResultResponse', false, 'ReportQuery']);
    expect(schemas.$defs.SimulationArtifact.properties.kind).toEqual({ enum: ['run', 'series', 'members'] });
  });

  it('a request is optional fields only: locale as bounded untrusted text, a scope and a time zone', () => {
    ok('ReportRequest', {});
    ok('ReportRequest', { locale: null });
    ok('ReportRequest', { locale: 'pt-BR', scope: { kind: 'run' }, display_profile: { time_zone: 'America/Sao_Paulo' } });
    ok('ReportRequest', { locale: '<script>alert(1)</script>', scope: { kind: 'season', crop_id: 'soy', harvest_year: 2027 } });
    bad('ReportRequest', { locale: 'x'.repeat(257) });
    bad('ReportRequest', { locale: 5 });
    bad('ReportRequest', { scope: { kind: 'season', crop_id: 'soy' } });
    bad('ReportRequest', { scope: { kind: 'run', crop_id: 'soy' } });
    bad('ReportRequest', { display_profile: { time_zone: 'UTC; DROP' } });
    // No metric, template version or storage path can be sent by the browser.
    for (const extra of [{ facts: {} }, { template_version: '9' }, { path: 'x' }, { quantiles: {} }, { run: {} }]) bad('ReportRequest', extra);
  });

  it('a read names a report id and one of the three formats; pdf is not offered', () => {
    ok('ReportQuery', { report_id: `rep_${'a'.repeat(32)}` });
    for (const format of ['json', 'html', 'md']) ok('ReportQuery', { report_id: `rep_${'0'.repeat(32)}`, format });
    bad('ReportQuery', { report_id: `rep_${'0'.repeat(32)}`, format: 'pdf' });
    bad('ReportQuery', { format: 'html' });
    bad('ReportQuery', { report_id: 'rep_../../etc' });
  });

  it('the report state is separate from the execution status and locale resolution names its fallback reason', () => {
    expect(schemas.$defs.ReportGenerationState).toEqual({ enum: ['queued', 'running', 'succeeded', 'failed'] });
    ok('ReportLocaleResolution', { requested_locale: null, resolved_locale: 'en', fallback_reason: 'missing' });
    ok('ReportLocaleResolution', { requested_locale: 'pt-PT', resolved_locale: 'pt-BR', fallback_reason: null });
    bad('ReportLocaleResolution', { requested_locale: 'ja', resolved_locale: 'ja', fallback_reason: 'unsupported' });
    ok('ReportGenerationResult', { state: 'failed', report_id: `rep_${'1'.repeat(32)}`, run_id: `sim_${'1'.repeat(24)}`, reused: false, locale_resolution: null, representation: null, links: null, error: { code: 'report_generation_failed', attempts: 2 } });
  });

  it('a yield fact is discriminated by its shape and an unavailable one cannot carry a number', () => {
    ok('ReportYieldFact', { id: 'season:soy:2027:yield', variant: 'unavailable', reason_code: 'source_unavailable' });
    bad('ReportYieldFact', { id: 'season:soy:2027:yield', variant: 'unavailable', reason_code: 'source_unavailable', value_kg_ha: 0 });
  });
});
