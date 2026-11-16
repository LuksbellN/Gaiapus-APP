// Task 1 of the technical reports: facts are read from a saved, verified run, never recomputed; scope, availability,
// event counts, yield variants and integrity follow the plan (sections 4, 5 and 13).
import { describe, expect, it } from 'vitest';
import { validators, type ReportFacts, type SimulationRun } from '@gaiapus/contracts';
import { ApiError } from '../plugins/errors.js';
import { PublicationStore, pinnedBrazilSource } from './simulations/publication-store.js';
import { buildReportFacts, factsDigest, resolveEvidence } from './simulations/reports/facts.js';
import { loadVerifiedReportInput } from './simulations/reports/input.js';
import { BARREIRAS_SOY, STORY_MAIZE_2027, SUMNER_WHEAT_2028, UBERLANDIA_ROTATION, brIndex, brRun, derivedSource, flipLastByte, fullStore, usCatalog, usIndex, usRun, usWithoutSeries } from '../../tests/report-fixtures.js';

const WHOLE = { kind: 'run' } as const;
const valid = (facts: ReportFacts) => expect(validators.ReportFacts!(facts), JSON.stringify(validators.ReportFacts!.errors?.slice(0, 3))).toBe(true);
const factsOf = async (store: PublicationStore, id: string, scope: Parameters<typeof loadVerifiedReportInput>[2] = WHOLE) => buildReportFacts(await loadVerifiedReportInput(store, id, scope));
const season = (facts: ReportFacts, crop: string, year: number) => facts.seasons.find(s => s.crop_id === crop && s.harvest_year === year)!;
const metric = (facts: ReportFacts, crop: string, year: number, id: string) => season(facts, crop, year).metrics.find(m => m.metric_id === id)!;
/** Facts of a changed copy of a real run (schema-valid input built in memory, no artifact involved). */
const factsOfRun = (run: SimulationRun) => buildReportFacts({ run, scope: WHOLE, visibility: 'public_regional', artifacts: [{ kind: 'run', sha256: 'a'.repeat(64), bytes: 1 }], series: { status: 'absent' } });

describe('report facts of the real Uberlândia run', () => {
  it('keeps the published numbers, hashes and dates exactly as saved', async () => {
    const facts = await factsOf(fullStore(), UBERLANDIA_ROTATION);
    valid(facts);
    const run = brRun(UBERLANDIA_ROTATION);
    expect([facts.run.run_id, facts.run.as_of, facts.run.issued_at]).toEqual([run.run_id, '2026-08-31T23:59:00+00:00', '2026-11-15T13:41:40.164900+00:00']);
    expect(facts.run.as_of).not.toBe(facts.run.issued_at);
    const deficit = metric(facts, 'soy', 2027, 'crop_deficit_mm');
    expect([deficit.p10, deficit.p50, deficit.p90, deficit.n, deficit.unit]).toEqual([0.04507624000978585, 13.164959099152812, 74.77797564290594, 22, 'mm']);
    // The deficit is the published quantile, not a subtraction of the ETc and ETa quantiles (about 17.2 mm here).
    const etc = metric(facts, 'soy', 2027, 'crop_etc_mm'), eta = metric(facts, 'soy', 2027, 'crop_eta_mm');
    expect(etc.p50 - eta.p50).toBeCloseTo(17.167, 2);
    expect(deficit.p50).not.toBeCloseTo(etc.p50 - eta.p50, 1);
    // Interpolated quantiles of day counts stay fractional.
    expect(metric(facts, 'soy', 2027, 'reproductive_stress_days').p50).toBe(6.5);
    expect(metric(facts, 'soy', 2027, 'reproductive_stress_days').p10).toBe(0);
    const publication = brIndex.publications.find(p => p.run_id === UBERLANDIA_ROTATION)!;
    expect(facts.sources).toEqual(publication.artifacts.map(a => ({ kind: a.kind, sha256: a.sha256, bytes: a.bytes })));
    expect([facts.run.identity_sha256, facts.run.series_sha256]).toEqual([run.checksums.identity_sha256, run.checksums.series_sha256]);
    expect([facts.soil.capacity_mm, facts.soil.is_hypothesis, facts.ensemble.members, facts.ensemble.seed]).toEqual([55, true, 22, 42]);
  });

  it('derives event counts only from a consistent share and keeps the denominator', async () => {
    const facts = await factsOf(fullStore(), UBERLANDIA_ROTATION);
    const events = Object.fromEntries(season(facts, 'soy', 2027).events.map(e => [e.event_id, e]));
    expect([events.reproductive_stress_days_ge_10!.count, events.reproductive_stress_days_ge_10!.members, events.reproductive_stress_days_ge_10!.count_status]).toEqual([7, 22, 'derived']);
    expect([events.crop_deficit_mm_ge_100!.count, events.dry_spell_ge_15_days_in_season!.count]).toEqual([2, 1]);
    expect(events.reproductive_stress_days_ge_10!.share_of_members).toBe(0.3181818181818182);
  });

  it('describes the municipal yield as a historical reference independent of the scenarios', async () => {
    const facts = await factsOf(fullStore(), UBERLANDIA_ROTATION);
    const y = season(facts, 'soy', 2027).yield;
    expect(y.variant).toBe('historical_reference');
    if (y.variant !== 'historical_reference') throw new Error('unexpected variant');
    expect([y.value_kg_ha, y.years_used, y.last_label_year, y.conditional_on_scenario, y.scale.kind, y.method]).toEqual([3502, [2017, 2018, 2019, 2020, 2021], 2021, false, 'municipal', 'mean_last_5_published_pam_yields']);
    expect(y.label_release_rule).toEqual({ kind: 'code', code: 'ibge_pam_published_by_31_october_next_year' });
  });

  it('exposes no internal path, file name or raw provenance object, and flags a source file that goes beyond the cutoff', async () => {
    const facts = await factsOf(fullStore(), UBERLANDIA_ROTATION);
    const text = JSON.stringify(facts);
    for (const leak of ['data/ingest', 'data/models', 'power_3170206.json', 'BR_ibge_3170206.json', 'T2MDEW', 'IMERG_PRECTOT"']) expect(text).not.toContain(leak);
    const observed = facts.data_sources.find(s => s.role === 'observed')!;
    expect([observed.file_period, observed.covers_after_as_of]).toEqual([{ start: '2025-01-01', end: '2026-11-14' }, true]);
    expect(facts.weather_segments.find(s => s.kind === 'observed')).toMatchObject({ start: '2025-01-01', end: '2026-08-31' });
    expect(facts.warnings).toContainEqual({ code: 'source_covers_after_cutoff', subject: 'observed' });
    expect(season(facts, 'soy', 2027).calendar_source).toEqual({ kind: 'code', code: 'fixed_state_calendar_hypothesis' });
    expect(facts.limitations.map(l => l.fact)).toContainEqual({ kind: 'code', code: 'historical_frequency_not_probability' });
    expect(facts.limitations.every(l => l.fact.kind === 'code')).toBe(true);
  });

  it('states economics and management comparison as unavailable, never as numbers', async () => {
    const facts = await factsOf(fullStore(), UBERLANDIA_ROTATION);
    expect(facts.economics).toEqual({ status: 'unavailable', reason_code: 'no_integrated_budget' });
    expect(facts.management_comparison).toEqual({ status: 'unavailable', reason_code: 'no_paired_management_result' });
    expect(JSON.stringify(facts)).not.toMatch(/currency|price|revenue|margin|cost|irrigation_mm/i);
    expect(facts.sections.find(s => s.id === 'yield_economics')).toEqual({ id: 'yield_economics', status: 'partial', reason_code: 'economics_not_integrated' });
  });
});

describe('report facts across every published run', () => {
  const ids = [...brIndex.publications, ...usIndex.publications].map(p => p.run_id);
  it('validate against the contract, resolve every evidence id and keep at most three distinct conclusions and actions', async () => {
    expect(ids.length).toBe(12);
    const store = fullStore();
    for (const id of ids) {
      const facts = await factsOf(store, id);
      valid(facts);
      const linked = [...facts.conclusions, facts.caveat, ...facts.actions];
      for (const item of linked) { expect(item.evidence_ids.length, `${id} ${item.code}`).toBeGreaterThan(0); for (const e of item.evidence_ids) expect(resolveEvidence(facts, e), `${id} ${e}`).toBeDefined(); }
      expect(facts.conclusions.length).toBeLessThanOrEqual(3);
      expect(facts.actions.length).toBeLessThanOrEqual(3);
      expect(new Set(facts.conclusions.map(c => c.code)).size).toBe(facts.conclusions.length);
      expect(new Set(facts.actions.map(a => a.code)).size).toBe(facts.actions.length);
    }
  });

  it('are deterministic: same digest on a second build and for a run whose seasons and keys arrive in another order', async () => {
    const store = fullStore();
    const first = await factsOf(store, UBERLANDIA_ROTATION);
    expect(factsDigest(await factsOf(store, UBERLANDIA_ROTATION))).toBe(factsDigest(first));
    const run = brRun(UBERLANDIA_ROTATION);
    const shuffled = { ...run, seasons: [...run.seasons].reverse().map(s => ({ ...s, events: [...s.events].reverse(), quantiles: Object.fromEntries(Object.entries(s.quantiles).reverse()) })) } as SimulationRun;
    const a = factsOfRun(run), b = factsOfRun(shuffled);
    expect(factsDigest(b)).toBe(factsDigest(a));
    expect(a.seasons.map(s => `${s.crop_id}:${s.harvest_year}`)).toEqual(['soy:2027', 'maize2:2027', 'soy:2028', 'maize2:2028']);
    expect(factsDigest(first)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('scope', () => {
  it('a season scope holds only that season and has its own digest; an unknown season is refused', async () => {
    const store = fullStore();
    const whole = await factsOf(store, UBERLANDIA_ROTATION);
    const one = await factsOf(store, UBERLANDIA_ROTATION, { kind: 'season', crop_id: 'maize2', harvest_year: 2028 });
    valid(one);
    expect(one.seasons.map(s => s.id)).toEqual(['season:maize2:2028']);
    expect([whole.seasons.length, whole.run.seasons_in_run, one.run.seasons_in_run]).toEqual([4, 4, 4]);
    expect(factsDigest(one)).not.toBe(factsDigest(whole));
    expect(one.seasons[0]).toEqual(season(whole, 'maize2', 2028));
    await expect(factsOf(store, UBERLANDIA_ROTATION, { kind: 'season', crop_id: 'wheat', harvest_year: 2027 })).rejects.toMatchObject({ status: 422, code: 'invalid_input' });
  });
});

describe('missing values, partial runs and yield variants', () => {
  it('an unavailable yield carries its reason and no value', async () => {
    const facts = await factsOf(fullStore(), BARREIRAS_SOY);
    const y = season(facts, 'soy', 2027).yield;
    expect(y).toEqual({ id: 'season:soy:2027:yield', variant: 'unavailable', reason_code: 'source_unavailable' });
    expect(facts.conclusions.map(c => c.code)).toContain('yield_unavailable');
    expect(facts.actions.map(a => a.code)).toContain('obtain_local_yield');
  });

  it('a US run keeps the modelled yield with its ranges and research status, and only the metrics it publishes', async () => {
    const facts = await factsOf(fullStore(), STORY_MAIZE_2027);
    valid(facts);
    const s = season(facts, 'maize', 2027), y = s.yield;
    if (y.variant !== 'model') throw new Error('unexpected variant');
    const source = usRun(STORY_MAIZE_2027).seasons[0]!.yield as { scenario_range: unknown; predictive_range: unknown };
    expect([y.status, y.model_version, y.research_status, y.position_vs_season, y.conditional_on_scenario, y.scale.kind]).toEqual(['research', 'research_us_v2/product/IA_maize_shared', 'research_confirmed', 'pre_season', true, 'county']);
    expect([y.scenario_range, y.predictive_range]).toEqual([source.scenario_range, source.predictive_range]);
    expect(s.metrics.map(m => m.metric_id)).toEqual(['rain_mm', 'crop_eta_mm', 'crop_deficit_mm', 'reproductive_stress_days', 'yield_kg_ha']);
    expect(s.metrics.every(m => m.known)).toBe(true);
    expect(s.events).toEqual([expect.objectContaining({ event_id: 'reproductive_stress_ge_20d', known: true, count: 23, members: 26 })]);
    expect(facts.ensemble.excluded_years).toEqual([{ year: 2026, reason: { kind: 'code', code: 'missing_values' } }]);
    expect(facts.data_sources.find(d => d.role === 'observed')).toBeUndefined();
  });

  it('a model result whose status is "reference" stays a model result (review focus 2)', () => {
    const run = structuredClone(usRun(STORY_MAIZE_2027));
    (run.seasons[0]!.yield as { status: string }).status = 'reference';
    expect(validators.SimulationRun!(run)).toBe(true);
    const y = factsOfRun(run).seasons[0]!.yield;
    if (y.variant !== 'model') throw new Error('unexpected variant');
    expect([y.status, y.model_version, y.research_status]).toEqual(['reference', 'research_us_v2/product/IA_maize_shared', 'research_confirmed']);
  });

  it('a valid run without a series artifact still yields facts: yield and seasonal statistics, no trajectories', async () => {
    const store = new PublicationStore([pinnedBrazilSource(), usWithoutSeries(SUMNER_WHEAT_2028)]);
    const facts = await factsOf(store, SUMNER_WHEAT_2028);
    valid(facts);
    const s = season(facts, 'wheat_winter', 2028);
    expect([s.trajectories, s.phases, s.day_kinds]).toEqual([null, null, null]);
    expect(facts.charts).toEqual({ status: 'unavailable', reason_code: 'no_series_artifact' });
    expect(facts.sources.map(x => x.kind)).toEqual(['run']);
    expect(s.yield.variant).toBe('model');
    expect(s.metrics.length).toBe(5);
    expect(facts.sections.find(x => x.id === 'results')!.status).toBe('available');
  });

  it('with a series, trajectories are the three representative members and their published season deficit', async () => {
    const facts = await factsOf(fullStore(), UBERLANDIA_ROTATION);
    const run = brRun(UBERLANDIA_ROTATION), s = season(facts, 'soy', 2027);
    expect(s.trajectories!.map(t => [t.role, t.member_id])).toEqual([['central', run.representative.central], ['dry', run.representative.dry], ['wet', run.representative.wet]]);
    const members = run.seasons[0]!.members as Record<string, Record<string, number>>;
    for (const t of s.trajectories!) expect(t.season_deficit_mm).toBe(members[t.member_id]!.crop_deficit_mm);
    expect(s.phases!.map(p => p.phase_code)).toEqual(['establishment', 'vegetative', 'reproductive', 'maturation']);
    expect([s.phases![0]!.start, s.phases!.at(-1)!.end]).toEqual([s.sowing_date, s.expected_harvest_date]);
    expect(s.day_kinds).toEqual([{ kind: 'climatological_scenario', start: s.sowing_date, end: s.expected_harvest_date }]);
    expect(facts.charts).toEqual({ status: 'available', reason_code: null });
  });

  it('an unknown metric or event gets no invented unit or name: kept, flagged and left out of the conclusions', () => {
    const run = structuredClone(brRun(UBERLANDIA_ROTATION));
    for (const s of run.seasons) {
      s.quantiles.heat_index = { p10: 900, p50: 950, p90: 999, n: 22 };
      s.events.push({ event_id: 'heat_wave_ge_3', share_of_members: 1, members: 22 });
    }
    const facts = factsOfRun(run);
    valid(facts);
    expect(metric(facts, 'soy', 2027, 'heat_index')).toMatchObject({ known: false, unit: null, p50: 950 });
    expect(season(facts, 'soy', 2027).events.find(e => e.event_id === 'heat_wave_ge_3')).toMatchObject({ known: false, count: 22 });
    expect(facts.warnings).toContainEqual({ code: 'unknown_metric', subject: 'heat_index' });
    expect(facts.warnings).toContainEqual({ code: 'unknown_event', subject: 'heat_wave_ge_3' });
    expect(facts.conclusions.flatMap(c => c.evidence_ids).some(id => id.includes('heat'))).toBe(false);
    expect(facts.sections.find(s => s.id === 'results')).toEqual({ id: 'results', status: 'partial', reason_code: 'unknown_metrics_present' });
  });

  it('an inconsistent event share gives no derived count; zero stays zero', () => {
    const run = structuredClone(brRun(UBERLANDIA_ROTATION));
    run.seasons[0]!.events = [{ event_id: 'reproductive_stress_days_ge_10', share_of_members: 0.33, members: 22 }, { event_id: 'crop_deficit_mm_ge_100', share_of_members: 1.2, members: 22 },
      { event_id: 'dry_spell_ge_15_days_in_season', share_of_members: 0, members: 22 }];
    const facts = factsOfRun(run), events = season(facts, 'soy', 2027).events;
    expect(events.map(e => [e.count, e.count_status])).toEqual([[null, 'inconsistent'], [0, 'derived'], [null, 'inconsistent']]);
    expect(facts.warnings.filter(w => w.code === 'event_share_inconsistent').length).toBe(2);
  });

  it('unknown limitation text is kept as original evidence with a warning, and path-like tokens are redacted', () => {
    const run = structuredClone(brRun(UBERLANDIA_ROTATION));
    run.limitations.push('Calibrated with data/private/farm_42.csv only for <b>clay</b> soils');
    const facts = factsOfRun(run);
    const last = facts.limitations.at(-1)!.fact;
    expect(last).toEqual({ kind: 'text', text: 'Calibrated with [internal reference] only for <b>clay</b> soils', lang: null });
    expect(facts.warnings).toContainEqual({ code: 'untranslated_source_text', subject: 'limitation' });
  });
});

describe('integrity and catalog-only capabilities', () => {
  it('a corrupted run artifact stops the report input; a corrupted series only removes the series facts', async () => {
    const corruptRun = new PublicationStore([derivedSource(pinnedBrazilSource(), { bytes: (a, b) => (a.kind === 'run' ? flipLastByte(b) : b) })]);
    await expect(loadVerifiedReportInput(corruptRun, UBERLANDIA_ROTATION, WHOLE)).rejects.toMatchObject({ status: 500, message: 'Artifact integrity check failed' });
    const corruptSeries = new PublicationStore([derivedSource(pinnedBrazilSource(), { bytes: (a, b) => (a.kind === 'series' ? flipLastByte(b) : b) })]);
    const facts = await factsOf(corruptSeries, UBERLANDIA_ROTATION);
    valid(facts);
    expect(facts.charts).toEqual({ status: 'unavailable', reason_code: 'series_integrity_failed' });
    expect(facts.warnings).toContainEqual({ code: 'series_integrity_failed', subject: 'series' });
    expect(season(facts, 'soy', 2027).trajectories).toBeNull();
    expect(metric(facts, 'soy', 2027, 'crop_deficit_mm').p50).toBe(13.164959099152812);
  });

  it('an unreachable series source is an error to retry, not a degraded report', async () => {
    const store = new PublicationStore([derivedSource(pinnedBrazilSource(), { fail: a => a.kind === 'series' })]);
    await expect(loadVerifiedReportInput(store, UBERLANDIA_ROTATION, WHOLE)).rejects.toMatchObject({ status: 503, code: 'simulation_source_unavailable' });
  });

  it('a capability with a yield result and no run keeps its catalog result and offers no run to report on', async () => {
    const store = fullStore();
    const place = (await store.catalog({ location_id: 'US:fips:19169', crop_id: 'soy', harvest_year: '2026' })).places[0]!;
    const capability = place.capabilities[0] as { run_ids: string[]; status: string; reason_code: string; yield_result: Record<string, unknown> };
    const original = usCatalog.places.find(p => p.location_id === 'US:fips:19169')!.capabilities.find(c => c.crop_id === 'soy' && c.harvest_year === 2026)!;
    expect(capability).toEqual(original);
    expect([capability.run_ids, capability.status, capability.reason_code]).toEqual([[], 'missing_data', 'post_harvest_no_daily_series']);
    expect([capability.yield_result.model_version, capability.yield_result.position_vs_season]).toEqual(['research_us_v2/product/IA_soy_in_season', 'post_harvest_pre_release']);
    // No run exists for it: nothing to build a report from, and an invented id is simply unknown.
    await expect(loadVerifiedReportInput(store, 'sim_000000000000000000000000', WHOLE)).rejects.toBeInstanceOf(ApiError);
    await expect(loadVerifiedReportInput(store, 'sim_000000000000000000000000', WHOLE)).rejects.toMatchObject({ status: 404 });
  });
});
