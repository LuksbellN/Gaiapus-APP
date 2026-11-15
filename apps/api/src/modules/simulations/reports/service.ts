// ensureReport: one idempotent operation that makes sure a representation of a succeeded run exists for a locale,
// scope and display profile, and returns it. Rendering is deterministic and fast, so it happens inside the request:
// there is no queue and the state goes straight to "succeeded" (or "failed", which never touches the simulation).
// The report state is separate from the execution status of the science, and so is its storage.
import { createHash } from 'node:crypto';
import { canonicalJson, validators } from '@gaiapus/contracts';
import type { ReportDisplayProfile, ReportGenerationResult, ReportLocale, ReportLocaleResolution, ReportScope } from '@gaiapus/contracts';
import { ApiError } from '../../../plugins/errors.js';
import type { PublicationStore } from '../publication-store.js';
import { buildReportFacts, scopeKey } from './facts.js';
import { loadVerifiedReportInput } from './input.js';
import { isKnownTimeZone, resolveReportLocale } from './locale.js';
import { REPORT_CATALOGS, REPORT_TRANSLATION_VERSION } from './messages/index.js';
import { REPORT_SCHEMA_VERSION, REPORT_TEMPLATE_VERSION } from './registry.js';
import { DEFAULT_DISPLAY_PROFILE, renderReportWithExports } from './render.js';
import { defaultReportRepository, isIntact, type ReportRepository, type StoredReport } from './repository.js';

/** Ids, scope, locale and display profile only: the browser never sends metrics, templates or storage paths. */
export interface AuthorizedReportRequest {
  run_id: string;
  locale?: string | null;
  scope?: ReportScope;
  display_profile?: { time_zone?: string };
}
/** One line per request for operators: identifiers, codes and timings; never a payload. */
export interface ReportLogEvent { event: 'report_generated' | 'report_reused' | 'report_failed'; report_id: string; run_id: string; scope: string; locale: ReportLocale; duration_ms: number; bytes?: number; error_code?: string; attempts?: number }
export interface ReportServiceOptions {
  repository?: ReportRepository;
  now?: () => Date;
  /** New representations per minute for the whole process; reuse of an existing one is never limited. */
  generationsPerMinute?: number;
  render?: typeof renderReportWithExports;
  log?: (event: ReportLogEvent) => void;
  localeAvailable?: (locale: ReportLocale) => boolean;
}
export interface EnsuredReport { result: ReportGenerationResult; durable: boolean }

const linksOf = (runId: string, reportId: string) => {
  const base = `/v1/simulations/${runId}/report?report_id=${reportId}&format=`;
  return { json: `${base}json`, html: `${base}html`, md: `${base}md` };
};

export class ReportService {
  private readonly repository: ReportRepository;
  private readonly now: () => Date;
  private readonly render: typeof renderReportWithExports;
  private readonly inflight = new Map<string, Promise<EnsuredReport>>();
  private readonly limit: number;
  private window = { start: 0, used: 0 };
  constructor(private readonly store: PublicationStore, private readonly options: ReportServiceOptions = {}) {
    this.repository = options.repository ?? defaultReportRepository();
    this.now = options.now ?? (() => new Date());
    this.render = options.render ?? renderReportWithExports;
    this.limit = options.generationsPerMinute ?? 120;
  }

  private takeGenerationSlot() {
    const at = this.now().getTime();
    if (at - this.window.start >= 60_000) this.window = { start: at, used: 0 };
    if (this.window.used >= this.limit) throw new ApiError(429, 'rate_limited', 'Too many new reports were requested; try again in a minute');
    this.window.used++;
  }

  async ensure(request: AuthorizedReportRequest): Promise<EnsuredReport> {
    // The locale is captured here, once: whatever happens to the interface afterwards, this request keeps it.
    const locale_resolution: ReportLocaleResolution = resolveReportLocale(request.locale ?? null, { available: this.options.localeAvailable ?? (l => l in REPORT_CATALOGS) });
    const time_zone = request.display_profile?.time_zone ?? DEFAULT_DISPLAY_PROFILE.time_zone;
    if (!isKnownTimeZone(time_zone)) throw new ApiError(422, 'invalid_input', 'Request does not match the contract', { 'display_profile.time_zone': 'Unknown time zone' });
    const display_profile: ReportDisplayProfile = { ...DEFAULT_DISPLAY_PROFILE, time_zone };
    const input = await loadVerifiedReportInput(this.store, request.run_id, request.scope);
    const locale = locale_resolution.resolved_locale;
    // Identity of the representation: everything that changes its bytes, and nothing else (no theme, cursor or zoom).
    const variant = { schema: REPORT_SCHEMA_VERSION, template: REPORT_TEMPLATE_VERSION, translation: REPORT_TRANSLATION_VERSION, run_id: request.run_id, access: 'public',
      sources: input.artifacts.filter(a => a.kind === 'run' || (a.kind === 'series' && input.series.status === 'available')).map(a => `${a.kind}:${a.sha256}`), series: input.series.status,
      scope: scopeKey(input.scope), locale, display_profile };
    const report_id = `rep_${createHash('sha256').update(canonicalJson(variant)).digest('hex').slice(0, 32)}`;
    const started = performance.now();
    const base = { report_id, run_id: request.run_id, scope: scopeKey(input.scope), locale };
    const answer = (stored: StoredReport, reused: boolean): EnsuredReport => ({ durable: stored.durable,
      result: { state: 'succeeded', report_id, run_id: request.run_id, reused, locale_resolution, representation: stored.representation, links: linksOf(request.run_id, report_id), error: null } });

    const existing = await this.repository.get(report_id);
    if (existing && existing.run_id === request.run_id) {
      this.options.log?.({ event: 'report_reused', ...base, duration_ms: Math.round(performance.now() - started) });
      return answer(existing, true);
    }
    // Equivalent concurrent requests share one generation and therefore one generated_at.
    const pending = this.inflight.get(report_id);
    if (pending) return pending.then(done => (done.result.state === 'succeeded' ? { ...done, result: { ...done.result, reused: true, locale_resolution } } : { ...done, result: { ...done.result, locale_resolution } }));
    this.takeGenerationSlot();
    const generation = (async (): Promise<EnsuredReport> => {
      try {
        const facts = buildReportFacts(input);
        const rendered = this.render(facts, { report_id, resolved_locale: locale, display_profile, generated_at: this.now().toISOString(), series: input.series.status === 'available' ? input.series.data : null });
        const candidate: StoredReport = { report_id, run_id: request.run_id, representation: rendered.representation, html: rendered.html, markdown: rendered.markdown, durable: false };
        if (!validators.ReportFacts!(facts) || !isIntact(candidate)) throw new Error('report_contract_violation');
        const stored = await this.repository.putIfAbsent(candidate);
        await this.repository.clearFailure(report_id);
        this.options.log?.({ event: 'report_generated', ...base, duration_ms: Math.round(performance.now() - started), bytes: rendered.html.length + rendered.markdown.length });
        return answer(stored, false);
      } catch (error) {
        // Client and availability errors keep their status; anything else is a report failure, separate from the science.
        if (error instanceof ApiError) throw error;
        const error_code = error instanceof Error && error.message === 'report_contract_violation' ? 'report_contract_violation' : 'report_generation_failed';
        const failure = await this.repository.recordFailure(report_id, error_code);
        this.options.log?.({ event: 'report_failed', ...base, duration_ms: Math.round(performance.now() - started), error_code, attempts: failure.attempts });
        return { durable: false, result: { state: 'failed', report_id, run_id: request.run_id, reused: false, locale_resolution, representation: null, links: null, error: failure } };
      }
    })().finally(() => { this.inflight.delete(report_id); });
    this.inflight.set(report_id, generation);
    return generation;
  }

  /**
   * A stored representation by id. Access is decided from the run every time: the report id is never an
   * authorisation, a report is served only under the run it belongs to, and never under a run whose current
   * artifact differs from the one it was built from or no longer passes its integrity check.
   */
  async read(runId: string, reportId: string): Promise<StoredReport> {
    const publication = await this.store.publication(runId);
    if (publication.visibility !== 'public_regional') throw new ApiError(404, 'not_found', 'Resource not found');
    await this.store.run(runId);
    const stored = await this.repository.get(reportId);
    const current = publication.artifacts.find(a => a.kind === 'run')?.sha256;
    if (!stored || stored.run_id !== runId || stored.representation.source_hashes.find(s => s.kind === 'run')?.sha256 !== current) throw new ApiError(404, 'not_found', 'Resource not found');
    return stored;
  }

  resultOf(stored: StoredReport): ReportGenerationResult {
    return { state: 'succeeded', report_id: stored.report_id, run_id: stored.run_id, reused: true, locale_resolution: null, representation: stored.representation, links: linksOf(stored.run_id, stored.report_id), error: null };
  }
}

/**
 * English reports of every public publication the store currently lists: what "a publication without a user"
 * gets. Meant to run once at start-up, in the background; a failure is reported and never stops the others.
 */
export async function warmReports(service: ReportService, store: PublicationStore, onError: (runId: string, message: string) => void = () => {}): Promise<{ ensured: number; failed: number }> {
  let ensured = 0, failed = 0;
  const { items } = await store.publications();
  for (const publication of items) {
    if (publication.visibility !== 'public_regional') continue;
    try { const { result } = await service.ensure({ run_id: publication.run_id }); if (result.state === 'succeeded') ensured++; else failed++; }
    catch (error) { failed++; onError(publication.run_id, error instanceof Error ? error.message : 'unknown error'); }
  }
  return { ensured, failed };
}
