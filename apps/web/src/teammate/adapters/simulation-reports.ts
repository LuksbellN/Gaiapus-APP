// Technical reports of future-planning simulations: one idempotent "make sure it exists" and reads by id.
// The browser sends ids, scope and the language it is actually rendering; it never sends a metric.
// Kept apart from adapters/simulations.ts so the scientific reads stay exactly four.
import type { ReportGenerationResult, ReportScope } from '@gaiapus/contracts';
import type { Locale } from '../i18n/locale';
import { AdapterError } from './core';
import { request } from './http';

const path = (runId: string) => `/simulations/${encodeURIComponent(runId)}/report`;
const query = (reportId: string, format: 'json' | 'html' | 'md') => `?report_id=${encodeURIComponent(reportId)}&format=${format}`;

export const simulationReports = {
  /** Ensures the representation for this run, scope and locale. Safe to repeat: the same request returns the same report. */
  ensure: (runId: string, options: { locale: Locale; scope: ReportScope }, signal?: AbortSignal) =>
    request<ReportGenerationResult>(path(runId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale: options.locale, scope: options.scope }), signal }),
  /** A saved representation by id, in the language it was saved with. */
  get: (runId: string, reportId: string, signal?: AbortSignal) => request<ReportGenerationResult>(`${path(runId)}${query(reportId, 'json')}`, { signal }),
  /** The Markdown export of exactly that representation (its own locale, whatever the interface shows now). */
  async markdown(runId: string, reportId: string, signal?: AbortSignal): Promise<string> {
    let response: Response;
    try { response = await fetch(`/v1${path(runId)}${query(reportId, 'md')}`, { headers: { Accept: 'text/markdown' }, signal }); }
    catch (error) { if ((error as Error).name === 'AbortError') throw error; throw new AdapterError(typeof navigator !== 'undefined' && navigator.onLine === false ? 'network' : 'api_unreachable', 0); }
    if (!response.ok) throw new AdapterError(response.status === 404 ? 'not_found' : 'request_failed', response.status);
    return response.text();
  },
  /** Address of an export served by the API (opened or downloaded by the person, never automatically). */
  exportUrl: (runId: string, reportId: string, format: 'html' | 'md') => `/v1${path(runId)}${query(reportId, format)}`,
};
