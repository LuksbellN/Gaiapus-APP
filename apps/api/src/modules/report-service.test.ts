// Task 3 of the technical reports: ensureReport, the two routes, storage and the automatic paths (plan sections 8
// and 10). Authorisation comes from the run, never from knowing an id; reports never touch the scientific artifacts.
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validators, type ReportGenerationResult, type SimulationRun } from '@gaiapus/contracts';
import { createApp } from '../app.js';
import { PublicationStore, pinnedBrazilSource, type Artifact, type PublicationSource } from './simulations/publication-store.js';
import { reportServiceFromEnv } from './simulations/config.js';
import { REPORT_CSS_SHA256 } from './simulations/reports/html.js';
import { precomputeReports } from './simulations/reports/precompute.js';
import { renderReportWithExports } from './simulations/reports/render.js';
import { FileReportRepository, LayeredReportRepository, MemoryReportRepository, PINNED_REPORTS_DIR, type ReportRepository } from './simulations/reports/repository.js';
import { ReportService, warmReports, type ReportLogEvent, type ReportServiceOptions } from './simulations/reports/service.js';
import { BARREIRAS_SOY, BR_DIR, STORY_MAIZE_2027, UBERLANDIA_ROTATION, brIndex, brRun, derivedSource, flipLastByte, fullStore, usSource } from '../../tests/report-fixtures.js';

const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const valid = (name: string, body: unknown) => expect(validators[name]!(body), JSON.stringify(validators[name]!.errors?.slice(0, 3))).toBe(true);
function harness(store: PublicationStore = fullStore(), options: ReportServiceOptions = {}) {
  const repository = options.repository ?? new MemoryReportRepository();
  const service = new ReportService(store, { ...options, repository });
  const app = createApp({ simulations: store, reports: service });
  const post = (id: string, body?: unknown) => app.inject({ method: 'POST', url: `/v1/simulations/${id}/report`, ...(body === undefined ? {} : { payload: body as Record<string, unknown> }) });
  const get = (id: string, reportId: string, format?: string) => app.inject(`/v1/simulations/${id}/report?report_id=${reportId}${format ? `&format=${format}` : ''}`);
  return { app, service, repository, post, get };
}
const dataOf = (response: { json(): { data: ReportGenerationResult } }) => response.json().data;
/** A source that publishes one in-memory run with a correct hash (for states the pinned runs never have). */
function syntheticSource(run: SimulationRun, visibility = 'public_regional'): PublicationSource {
  const bytes = Buffer.from(JSON.stringify(run));
  const artifact: Artifact = { kind: 'run', path: `runs/${run.run_id}/run.json`, sha256: sha(bytes), bytes: bytes.length, compression: null };
  return { id: 'synthetic', async load() { return { index: { as_of: run.as_of, publications: [{ run_id: run.run_id, location_id: run.location_id, plan_id: run.plan_id, crops: ['soy'], harvest_years: run.harvest_years, as_of: run.as_of, visibility, artifacts: [artifact] }] },
    catalog: { contract: 'future-simulation-capabilities.v1', as_of: run.as_of, harvest_years: run.harvest_years, places: [], inputs: {} } }; }, async artifact() { return bytes; } };
}

describe('POST /v1/simulations/:id/report', () => {
  it('ensures a report in the requested language and returns it in a typed envelope', async () => {
    const { app, post } = harness();
    const response = await post(UBERLANDIA_ROTATION, { locale: 'pt-BR' });
    expect(response.statusCode).toBe(200);
    valid('ReportGenerationResultResponse', response.json());
    const result = dataOf(response);
    expect([result.state, result.reused, result.run_id, result.error]).toEqual(['succeeded', false, UBERLANDIA_ROTATION, null]);
    expect(result.locale_resolution).toEqual({ requested_locale: 'pt-BR', resolved_locale: 'pt-BR', fallback_reason: null });
    expect(result.representation!.document.lang).toBe('pt-BR');
    expect(result.representation!.scope).toEqual({ kind: 'run' });
    expect(result.links).toEqual({ json: `/v1/simulations/${UBERLANDIA_ROTATION}/report?report_id=${result.report_id}&format=json`, html: `/v1/simulations/${UBERLANDIA_ROTATION}/report?report_id=${result.report_id}&format=html`, md: `/v1/simulations/${UBERLANDIA_ROTATION}/report?report_id=${result.report_id}&format=md` });
    // The envelope holds the locale resolution of this request: never cacheable.
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.json().meta).toMatchObject({ app_contract_version: '0.1.0', context_key: 'simulation-technical-report.v1' });
    await app.close();
  });

  it('is idempotent: the same request reuses the artifact and its generation time', async () => {
    const { app, post } = harness();
    const first = dataOf(await post(UBERLANDIA_ROTATION, { locale: 'de', scope: { kind: 'season', crop_id: 'soy', harvest_year: 2027 } }));
    const second = dataOf(await post(UBERLANDIA_ROTATION, { scope: { harvest_year: 2027, kind: 'season', crop_id: 'soy' }, locale: 'de-DE' }));
    expect([second.report_id, second.reused, second.representation!.generated_at]).toEqual([first.report_id, true, first.representation!.generated_at]);
    expect(second.representation).toEqual(first.representation);
    const whole = dataOf(await post(UBERLANDIA_ROTATION, { locale: 'de' }));
    expect(whole.report_id).not.toBe(first.report_id);
    expect(whole.representation!.facts_digest).not.toBe(first.representation!.facts_digest);
    await app.close();
  });

  it('requests that resolve to English share one representation and keep their own fallback reason', async () => {
    const { app, post } = harness(fullStore(), { localeAvailable: l => l !== 'fr' });
    const bodies = [undefined, {}, { locale: null }, { locale: 'en' }, { locale: 'en-US' }, { locale: 'ja' }, { locale: '<script>alert(1)</script>' }, { locale: 'fr' }];
    const results: ReportGenerationResult[] = [];
    for (const body of bodies) { const response = await post(UBERLANDIA_ROTATION, body); expect(response.statusCode).toBe(200); results.push(dataOf(response)); }
    expect(new Set(results.map(r => r.report_id)).size).toBe(1);
    expect(new Set(results.map(r => r.representation!.generated_at)).size).toBe(1);
    expect(results.map(r => r.locale_resolution!.fallback_reason)).toEqual(['missing', 'missing', 'missing', null, null, 'unsupported', 'invalid', 'catalog_unavailable']);
    expect(results.map(r => r.locale_resolution!.requested_locale)).toEqual([null, null, null, 'en', 'en-US', 'ja', '<script>alert(1)</script>', 'fr']);
    expect(results.map(r => r.reused)).toEqual([false, true, true, true, true, true, true, true]);
    expect(results.every(r => r.representation!.document.lang === 'en')).toBe(true);
    // The shared artifact knows nothing about any request's fallback.
    expect(JSON.stringify(results[0]!.representation)).not.toMatch(/fallback|unsupported|catalog_unavailable|requested_locale/);
    await app.close();
  });

  it('equivalent concurrent requests give one generation, one id and one generation time; no request is ever queued', async () => {
    let renders = 0;
    const { app, post } = harness(fullStore(), { render: (facts, options) => { renders++; return renderReportWithExports(facts, options); } });
    const responses = await Promise.all(Array.from({ length: 12 }, () => post(UBERLANDIA_ROTATION, { locale: 'es' })));
    const results = responses.map(dataOf);
    expect(responses.map(r => r.statusCode)).toEqual(Array(12).fill(200));
    expect(renders).toBe(1);
    expect(new Set(results.map(r => r.report_id)).size).toBe(1);
    expect(new Set(results.map(r => r.representation!.generated_at)).size).toBe(1);
    expect(results.every(r => r.state === 'succeeded')).toBe(true);
    expect(results.filter(r => !r.reused).length).toBe(1);
    await app.close();
  });

  it('accepts ids, scope, locale and time zone only, with size limits; anything else is refused', async () => {
    const { app, post } = harness();
    // A regional public report cannot be enriched by the request (review focus 1): private budget, prices or area are refused.
    for (const body of [{ budget: { currency: 'BRL', costs: [{ item: 'seed', value: 900 }] } }, { area_ha: 120 }, { price_per_kg: 2.1 }, { notes: 'private note' }, { facts: { seasons: [] } }, { locale: 'x'.repeat(300) }, { quantiles: { crop_deficit_mm: { p50: 1 } } }, { template_version: '0' }, { scope: { kind: 'season', crop_id: 'soy' } }, { scope: 'run' }, { display_profile: { time_zone: 'UTC', units: 'imperial' } }]) {
      const response = await post(UBERLANDIA_ROTATION, body);
      expect([response.statusCode, response.json().error.code], JSON.stringify(body)).toEqual([422, 'invalid_input']);
      expect(response.headers['cache-control']).toBe('private, no-store');
    }
    expect((await post(UBERLANDIA_ROTATION, { scope: { kind: 'season', crop_id: 'wheat', harvest_year: 2027 } })).json().error).toMatchObject({ code: 'invalid_input', field_errors: { scope: 'The run has no such crop season' } });
    expect((await post(UBERLANDIA_ROTATION, { display_profile: { time_zone: 'Mars/Olympus' } })).json().error).toMatchObject({ code: 'invalid_input', field_errors: { 'display_profile.time_zone': 'Unknown time zone' } });
    expect((await post('not-a-run', {})).statusCode).toBe(422);
    const big = await app.inject({ method: 'POST', url: `/v1/simulations/${UBERLANDIA_ROTATION}/report`, headers: { 'content-type': 'application/json' }, payload: JSON.stringify({ locale: 'en', scope: { kind: 'run' } }).padEnd(5000, ' ') });
    expect([big.statusCode, big.json().error.code]).toEqual([413, 'payload_too_large']);
    await app.close();
  });

  it('a display time zone is part of the representation identity and is recorded', async () => {
    const { app, post } = harness();
    const utc = dataOf(await post(UBERLANDIA_ROTATION, { locale: 'en' })), sp = dataOf(await post(UBERLANDIA_ROTATION, { locale: 'en', display_profile: { time_zone: 'America/Sao_Paulo' } }));
    expect(sp.report_id).not.toBe(utc.report_id);
    expect(sp.representation!.display_profile).toEqual({ time_zone: 'America/Sao_Paulo', units: 'canonical_metric' });
    expect(sp.representation!.facts_digest).toBe(utc.representation!.facts_digest);
    await app.close();
  });

  it('limits new generations for the whole process and never limits reuse', async () => {
    const { app, post } = harness(fullStore(), { generationsPerMinute: 2 });
    expect((await post(UBERLANDIA_ROTATION, { locale: 'en' })).statusCode).toBe(200);
    expect((await post(UBERLANDIA_ROTATION, { locale: 'es' })).statusCode).toBe(200);
    const third = await post(UBERLANDIA_ROTATION, { locale: 'fr' });
    expect([third.statusCode, third.json().error.code]).toEqual([429, 'rate_limited']);
    expect((await post(UBERLANDIA_ROTATION, { locale: 'en' })).statusCode).toBe(200);
    expect((await app.inject(`/v1/simulations/${UBERLANDIA_ROTATION}`)).statusCode).toBe(200);
    await app.close();
  });
});

describe('GET /v1/simulations/:id/report', () => {
  it('serves the stored representation as json, html and md, each matching its recorded hash', async () => {
    const { app, post, get } = harness();
    const created = dataOf(await post(UBERLANDIA_ROTATION, { locale: 'pt-BR' }));
    const json = await get(UBERLANDIA_ROTATION, created.report_id);
    valid('ReportGenerationResultResponse', json.json());
    expect(dataOf(json)).toMatchObject({ state: 'succeeded', report_id: created.report_id, reused: true, locale_resolution: null });
    expect(dataOf(json).representation).toEqual(created.representation);
    expect(dataOf(await get(UBERLANDIA_ROTATION, created.report_id, 'json')).representation).toEqual(created.representation);
    const html = await get(UBERLANDIA_ROTATION, created.report_id, 'html'), md = await get(UBERLANDIA_ROTATION, created.report_id, 'md');
    const artifacts = Object.fromEntries(created.representation!.artifacts.map(a => [a.format, a]));
    expect([html.statusCode, html.headers['content-type'], sha(html.body), Buffer.byteLength(html.body)]).toEqual([200, 'text/html; charset=utf-8', artifacts.html!.sha256, artifacts.html!.bytes]);
    expect([md.statusCode, md.headers['content-type'], sha(md.body), Buffer.byteLength(md.body)]).toEqual([200, 'text/markdown; charset=utf-8', artifacts.md!.sha256, artifacts.md!.bytes]);
    expect(html.headers['content-security-policy']).toBe(`default-src 'none'; style-src 'sha256-${REPORT_CSS_SHA256}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
    expect([html.headers['x-content-type-options'], html.headers['content-language'], html.headers.etag]).toEqual(['nosniff', 'pt-BR', `"${artifacts.html!.sha256}"`]);
    expect(html.body).toContain('<html lang="pt-BR"');
    expect(md.body.startsWith('# Relatório técnico de simulação — Uberlândia')).toBe(true);
    // Sanitised public artifact, in memory only: public, but not immutable (a restart regenerates it).
    expect(html.headers['cache-control']).toBe('public, max-age=300');
    await app.close();
  });

  it('rejects other formats and malformed ids, and offers no pdf', async () => {
    const { app, post, get } = harness();
    const created = dataOf(await post(UBERLANDIA_ROTATION, {}));
    for (const format of ['pdf', 'docx', 'HTML', '']) expect((await app.inject(`/v1/simulations/${UBERLANDIA_ROTATION}/report?report_id=${created.report_id}&format=${format}`)).statusCode, format).toBe(422);
    expect((await app.inject(`/v1/simulations/${UBERLANDIA_ROTATION}/report`)).statusCode).toBe(422);
    expect((await get(UBERLANDIA_ROTATION, 'rep_..%2F..%2Fetc')).statusCode).toBe(422);
    expect((await get(UBERLANDIA_ROTATION, `rep_${'0'.repeat(32)}`)).statusCode).toBe(404);
    expect((await app.inject(`/v1/simulations/${UBERLANDIA_ROTATION}/report?report_id=${created.report_id}&path=..%2Fx`)).statusCode).toBe(422);
    await app.close();
  });

  it('never serves a report under another run, an unknown run or an invented run id', async () => {
    const { app, post, get } = harness();
    const a = dataOf(await post(UBERLANDIA_ROTATION, {})), b = dataOf(await post(BARREIRAS_SOY, {}));
    for (const format of ['json', 'html', 'md']) {
      const crossed = await get(BARREIRAS_SOY, a.report_id, format);
      expect([crossed.statusCode, crossed.json().error.code]).toEqual([404, 'not_found']);
      expect(crossed.headers['cache-control']).toBe('private, no-store');
      expect(crossed.body).not.toContain('Uberl');
    }
    expect((await get(UBERLANDIA_ROTATION, b.report_id)).statusCode).toBe(404);
    expect((await get('sim_000000000000000000000000', a.report_id)).statusCode).toBe(404);
    // A capability without a run has no id to ask with; an invented one creates nothing.
    const invented = await post('sim_000000000000000000000000', { locale: 'en' });
    expect([invented.statusCode, invented.json().error.code]).toEqual([404, 'not_found']);
    await app.close();
  });
});

describe('access, status and integrity', () => {
  it('a publication that is not public is invisible here, even with a valid report id', async () => {
    const repository = new MemoryReportRepository();
    const open = harness(fullStore(), { repository });
    const created = dataOf(await open.post(UBERLANDIA_ROTATION, { locale: 'en' }));
    await open.app.close();
    const hidden = harness(new PublicationStore([derivedSource(pinnedBrazilSource(), { index: index => { for (const p of index.publications) if (p.run_id === UBERLANDIA_ROTATION) p.visibility = 'private'; } })]), { repository });
    for (const response of [await hidden.post(UBERLANDIA_ROTATION, { locale: 'en' }), await hidden.get(UBERLANDIA_ROTATION, created.report_id), await hidden.get(UBERLANDIA_ROTATION, created.report_id, 'html'), await hidden.get(UBERLANDIA_ROTATION, created.report_id, 'md')]) {
      expect([response.statusCode, response.json().error.code]).toEqual([404, 'not_found']);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(response.body).not.toMatch(/Uberl|kg\/ha|3502/);
    }
    // Another public run of the same source is still served.
    expect((await hidden.post(BARREIRAS_SOY, {})).statusCode).toBe(200);
    await hidden.app.close();
  });

  it.each(['queued', 'running', 'failed', 'cancelled'] as const)('a %s run has no report of results, and says why', async status => {
    const run = { ...brRun(UBERLANDIA_ROTATION), execution_status: status } as SimulationRun;
    const { app, post } = harness(new PublicationStore([syntheticSource(run)]));
    const response = await post(run.run_id, { locale: 'en' });
    expect([response.statusCode, response.json().error.code]).toEqual([409, 'simulation_not_succeeded']);
    expect(response.json().error.message).toContain(status);
    await app.close();
  });

  it('a corrupted run artifact is an explicit integrity error, never an older report served as valid', async () => {
    const repository = new MemoryReportRepository();
    const healthy = harness(fullStore(), { repository });
    const created = dataOf(await healthy.post(UBERLANDIA_ROTATION, { locale: 'en' }));
    await healthy.app.close();
    const broken = harness(new PublicationStore([derivedSource(pinnedBrazilSource(), { bytes: (a, b) => (a.kind === 'run' && a.path.includes(UBERLANDIA_ROTATION) ? flipLastByte(b) : b) })]), { repository });
    for (const response of [await broken.post(UBERLANDIA_ROTATION, { locale: 'en' }), await broken.get(UBERLANDIA_ROTATION, created.report_id), await broken.get(UBERLANDIA_ROTATION, created.report_id, 'html')]) {
      expect([response.statusCode, response.json().error]).toEqual([500, { code: 'internal_error', message: 'Artifact integrity check failed' }]);
      expect(response.body).not.toContain('13.2');
    }
    await broken.app.close();
  });

  it('a corrupted series gives a partial report under its own identity; the healthy report is another one', async () => {
    const healthy = harness();
    const good = dataOf(await healthy.post(UBERLANDIA_ROTATION, { locale: 'en' }));
    await healthy.app.close();
    const broken = harness(new PublicationStore([derivedSource(pinnedBrazilSource(), { bytes: (a, b) => (a.kind === 'series' ? flipLastByte(b) : b) })]));
    const partial = dataOf(await broken.post(UBERLANDIA_ROTATION, { locale: 'en' }));
    expect(partial.state).toBe('succeeded');
    expect(partial.report_id).not.toBe(good.report_id);
    expect(partial.representation!.sections.find(s => s.id === 'charts')).toEqual({ id: 'charts', status: 'unavailable', reason_code: 'series_integrity_failed' });
    expect(partial.representation!.source_hashes.map(s => s.kind)).toEqual(['run']);
    expect(good.representation!.source_hashes.map(s => s.kind)).toEqual(['run', 'series']);
    await broken.app.close();
  });

  it('a report that was built from another run artifact is not served under the same run id', async () => {
    const repository = new MemoryReportRepository();
    const original = brRun(UBERLANDIA_ROTATION);
    const first = harness(new PublicationStore([syntheticSource(original)]), { repository });
    const created = dataOf(await first.post(original.run_id, {}));
    await first.app.close();
    const republished = harness(new PublicationStore([syntheticSource({ ...original, issued_at: '2026-12-01T00:00:00+00:00' })]), { repository });
    expect((await republished.get(original.run_id, created.report_id)).statusCode).toBe(404);
    const again = dataOf(await republished.post(original.run_id, {}));
    expect(again.report_id).not.toBe(created.report_id);
    expect(again.reused).toBe(false);
    await republished.app.close();
  });
});

describe('failure and retry of the report only', () => {
  it('a failed rendering leaves the simulation reachable; retry repeats only the report and reads no artifact again', async () => {
    let reads = 0, renders = 0;
    const store = new PublicationStore([derivedSource(pinnedBrazilSource(), { bytes: (_, b) => { reads++; return b; } })]);
    const events: ReportLogEvent[] = [];
    const { app, post, get } = harness(store, { log: e => events.push(e), render: (facts, options) => { if (++renders <= 2) throw new Error('template exploded with <private> detail'); return renderReportWithExports(facts, options); } });
    const failed = await post(UBERLANDIA_ROTATION, { locale: 'pt-BR' });
    expect(failed.statusCode).toBe(200);
    valid('ReportGenerationResultResponse', failed.json());
    expect(dataOf(failed)).toMatchObject({ state: 'failed', reused: false, representation: null, links: null, error: { code: 'report_generation_failed', attempts: 1 } });
    expect(failed.body).not.toContain('exploded');
    // The scientific result is untouched and still served.
    const run = await app.inject(`/v1/simulations/${UBERLANDIA_ROTATION}`);
    expect([run.statusCode, run.json().data.execution_status]).toEqual([200, 'succeeded']);
    expect((await app.inject(`/v1/simulations/${UBERLANDIA_ROTATION}/series`)).statusCode).toBe(200);
    expect((await get(UBERLANDIA_ROTATION, dataOf(failed).report_id)).statusCode).toBe(404);
    const readsBeforeRetry = reads;
    const second = dataOf(await post(UBERLANDIA_ROTATION, { locale: 'pt-BR' }));
    expect(second.error).toEqual({ code: 'report_generation_failed', attempts: 2 });
    const third = dataOf(await post(UBERLANDIA_ROTATION, { locale: 'pt-BR' }));
    expect([third.state, third.report_id, third.error]).toEqual(['succeeded', dataOf(failed).report_id, null]);
    expect(reads).toBe(readsBeforeRetry);
    expect(reads).toBe(2);
    // Logs carry identifiers, codes and timings only.
    expect(events.map(e => e.event)).toEqual(['report_failed', 'report_failed', 'report_generated']);
    expect(events[0]).toMatchObject({ run_id: UBERLANDIA_ROTATION, locale: 'pt-BR', scope: 'run', error_code: 'report_generation_failed', attempts: 1 });
    expect(Object.keys(events[2]!).sort()).toEqual(['bytes', 'duration_ms', 'event', 'locale', 'report_id', 'run_id', 'scope']);
    expect(JSON.stringify(events)).not.toMatch(/exploded|private|Uberl/);
    await app.close();
  });
});

describe('storage', () => {
  it('a directory repository survives a restart with the same bytes and generation time, and its reads are immutable', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'gaiapus-reports-'));
    const first = harness(fullStore(), { repository: new FileReportRepository(directory, { writable: true }) });
    const created = dataOf(await first.post(UBERLANDIA_ROTATION, { locale: 'fr' }));
    const html = (await first.get(UBERLANDIA_ROTATION, created.report_id, 'html'));
    expect(html.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    await first.app.close();
    const second = harness(fullStore(), { repository: new FileReportRepository(directory, { writable: true }), now: () => new Date('2030-01-01T00:00:00Z') });
    const again = dataOf(await second.post(UBERLANDIA_ROTATION, { locale: 'fr' }));
    expect([again.report_id, again.reused, again.representation!.generated_at]).toEqual([created.report_id, true, created.representation!.generated_at]);
    expect((await second.get(UBERLANDIA_ROTATION, created.report_id, 'html')).body).toBe(html.body);
    expect(readdirSync(join(directory, 'reports'))).toEqual([created.report_id]);
    // A tampered export is never served: the report is regenerated.
    writeFileSync(join(directory, 'reports', created.report_id, 'report.html'), html.body.replace('Uberlândia', 'Elsewhere'));
    expect((await second.get(UBERLANDIA_ROTATION, created.report_id, 'html')).statusCode).toBe(404);
    const repaired = dataOf(await second.post(UBERLANDIA_ROTATION, { locale: 'fr' }));
    expect([repaired.reused, repaired.representation!.generated_at]).toEqual([false, '2030-01-01T00:00:00.000Z']);
    expect((await second.get(UBERLANDIA_ROTATION, created.report_id, 'html')).body).toContain('Uberlândia');
    await second.app.close();
  });

  it('a read-only layer answers first, new reports go to the writable layer, and ids are never used as paths', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'gaiapus-reports-ro-'));
    const writer = harness(fullStore(), { repository: new FileReportRepository(directory, { writable: true }) });
    const created = dataOf(await writer.post(UBERLANDIA_ROTATION, {}));
    await writer.app.close();
    const memory = new MemoryReportRepository();
    const layered = harness(fullStore(), { repository: new LayeredReportRepository([new FileReportRepository(directory)], memory) });
    expect(dataOf(await layered.post(UBERLANDIA_ROTATION, {}))).toMatchObject({ reused: true, report_id: created.report_id });
    expect(memory.stats().entries).toBe(0);
    expect(dataOf(await layered.post(UBERLANDIA_ROTATION, { locale: 'es' })).reused).toBe(false);
    expect(memory.stats().entries).toBe(1);
    expect(readdirSync(join(directory, 'reports')).length).toBe(1);
    const files = new FileReportRepository(directory, { writable: true });
    expect(await files.get('../../etc/passwd')).toBeNull();
    expect(() => files.remove('../..')).toThrow('Unexpected report id');
    await layered.app.close();
  });

  it('deployment configuration: pinned reports first, an optional directory for new ones, invalid values fail at start-up', async () => {
    const store = new PublicationStore([pinnedBrazilSource()]);
    const directory = mkdtempSync(join(tmpdir(), 'gaiapus-reports-env-'));
    const events: ReportLogEvent[] = [];
    const service = reportServiceFromEnv({ REPORT_STORE_DIR: directory, REPORT_GENERATIONS_PER_MINUTE: '5' }, store, e => events.push(e));
    expect((await service.ensure({ run_id: UBERLANDIA_ROTATION })).result.reused).toBe(true);
    const german = await service.ensure({ run_id: UBERLANDIA_ROTATION, locale: 'de' });
    expect([german.result.reused, german.durable]).toEqual([false, true]);
    expect(readdirSync(join(directory, 'reports'))).toEqual([german.result.report_id]);
    expect(events.map(e => e.event)).toEqual(['report_reused', 'report_generated']);
    expect(() => reportServiceFromEnv({ REPORT_GENERATIONS_PER_MINUTE: '0' }, store)).toThrow(/REPORT_GENERATIONS_PER_MINUTE/);
    expect(() => reportServiceFromEnv({ REPORT_CACHE_MB: 'big' }, store)).toThrow(/REPORT_CACHE_MB/);
  });

  it('memory is bounded: the least recently used report leaves first', async () => {
    const repository: ReportRepository = new MemoryReportRepository(700_000);
    const { app, post, get } = harness(fullStore(), { repository });
    const ids: string[] = [];
    for (const locale of ['en', 'es', 'fr', 'de', 'pt-BR']) ids.push(dataOf(await post(UBERLANDIA_ROTATION, { locale })).report_id);
    expect((repository as MemoryReportRepository).stats().bytes).toBeLessThanOrEqual(700_000);
    expect((await get(UBERLANDIA_ROTATION, ids[0]!)).statusCode).toBe(404);
    expect((await get(UBERLANDIA_ROTATION, ids.at(-1)!)).statusCode).toBe(200);
    await app.close();
  });
});

describe('automatic generation without a user', () => {
  const tree = (dir: string): Record<string, string> => Object.fromEntries(readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter(p => statSync(join(dir, p)).isFile()).sort().map(p => [p.replaceAll('\\', '/'), sha(readFileSync(join(dir, p)))]));

  it('start-up warm-up ensures the English report of every public publication and survives a failing one', async () => {
    const store = new PublicationStore([pinnedBrazilSource(), derivedSource(usSource(), { fail: a => a.path.includes(STORY_MAIZE_2027) })]);
    const repository = new MemoryReportRepository();
    const service = new ReportService(store, { repository });
    const failures: string[] = [];
    const outcome = await warmReports(service, store, id => failures.push(id));
    expect(outcome).toEqual({ ensured: 11, failed: 1 });
    expect(failures).toEqual([STORY_MAIZE_2027]);
    const again = await service.ensure({ run_id: UBERLANDIA_ROTATION });
    expect([again.result.reused, again.result.locale_resolution]).toEqual([true, { requested_locale: null, resolved_locale: 'en', fallback_reason: 'missing' }]);
  });

  it('precomputation writes reports in a directory of their own and changes no scientific file or hash', async () => {
    const before = tree(BR_DIR);
    const directory = mkdtempSync(join(tmpdir(), 'gaiapus-precompute-'));
    const store = new PublicationStore([pinnedBrazilSource()]);
    const written = await precomputeReports({ store, directory, locales: ['en', 'pt-BR'], now: () => new Date('2026-11-15T21:00:00Z') });
    expect([written.reports.length, written.generated, written.reused]).toEqual([14, 14, 0]);
    expect(written.reports.every(r => r.scope.kind === 'run')).toBe(true);
    expect(new Set(written.reports.map(r => r.run_id))).toEqual(new Set(brIndex.publications.map(p => p.run_id)));
    const index = JSON.parse(readFileSync(join(directory, 'index.json'), 'utf8'));
    expect(index).toMatchObject({ contract: 'simulation-technical-report-index.v1', reports: written.reports });
    for (const entry of written.reports) for (const artifact of entry.artifacts) expect(sha(readFileSync(join(directory, 'reports', entry.report_id, `report.${artifact.format}`)))).toBe(artifact.sha256);
    // Idempotent: a second run reuses every report and its generation time; --check accepts the directory.
    const again = await precomputeReports({ store, directory, locales: ['en', 'pt-BR'], now: () => new Date('2031-01-01T00:00:00Z') });
    expect([again.generated, again.reused]).toEqual([0, 14]);
    expect(again.reports).toEqual(written.reports);
    expect((await precomputeReports({ store, directory, locales: ['en', 'pt-BR'], check: true })).stale).toEqual([]);
    expect((await precomputeReports({ store, directory, locales: ['en', 'pt-BR', 'de'], check: true })).stale.length).toBe(7);
    // The API serves them as stored, immutable.
    const { app, post, get } = harness(store, { repository: new LayeredReportRepository([new FileReportRepository(directory)], new MemoryReportRepository()) });
    const served = dataOf(await post(UBERLANDIA_ROTATION, {}));
    expect([served.reused, served.representation!.generated_at, served.locale_resolution!.fallback_reason]).toEqual([true, '2026-11-15T21:00:00.000Z', 'missing']);
    expect((await get(UBERLANDIA_ROTATION, served.report_id, 'md')).headers['cache-control']).toBe('public, max-age=31536000, immutable');
    await app.close();
    expect(tree(BR_DIR)).toEqual(before);
    expect(Object.keys(before).some(p => /report/i.test(p))).toBe(false);
  });

  it('the reports pinned in the repository are current for the seven Brazilian runs, in English', async () => {
    const store = new PublicationStore([pinnedBrazilSource()]);
    const outcome = await precomputeReports({ store, directory: PINNED_REPORTS_DIR, locales: ['en'], check: true });
    expect(outcome.stale, 'run `pnpm --filter @gaiapus/api reports:precompute`').toEqual([]);
    expect(outcome.reports.length).toBe(7);
    const { app, post } = harness(store, { repository: new LayeredReportRepository([new FileReportRepository(PINNED_REPORTS_DIR)], new MemoryReportRepository()) });
    for (const publication of brIndex.publications) expect(dataOf(await post(publication.run_id)).reused, publication.run_id).toBe(true);
    await app.close();
  });

  it('the default application serves the pinned reports without generating anything', async () => {
    const app = createApp();
    const response = await app.inject({ method: 'POST', url: `/v1/simulations/${UBERLANDIA_ROTATION}/report` });
    expect([response.statusCode, response.json().data.reused, response.json().data.locale_resolution.fallback_reason]).toEqual([200, true, 'missing']);
    const md = await app.inject(`/v1/simulations/${UBERLANDIA_ROTATION}/report?report_id=${response.json().data.report_id}&format=md`);
    expect([md.statusCode, md.headers['cache-control']]).toEqual([200, 'public, max-age=31536000, immutable']);
    expect(md.body).toContain('Technical simulation report — Uberlândia');
    await app.close();
  });
});
