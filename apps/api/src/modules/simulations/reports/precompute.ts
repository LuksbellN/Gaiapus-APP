// Precomputation of reports for a publication, without a user: whole-run reports, English by default, written to a
// directory and index of their own (never next to run.json, whose bytes and hash stay untouched). This is the hook
// of the publication step: run it after pinning or activating a publication. `check` verifies a directory instead
// of writing: every expected report must exist, be intact and equal what the current code renders.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ReportLocale, ReportScope } from '@gaiapus/contracts';
import type { PublicationStore } from '../publication-store.js';
import { REPORT_TRANSLATION_VERSION } from './messages/index.js';
import { REPORT_SCHEMA_VERSION, REPORT_TEMPLATE_VERSION } from './registry.js';
import { FileReportRepository, LayeredReportRepository, MemoryReportRepository } from './repository.js';
import { ReportService } from './service.js';

export interface PrecomputeOptions {
  store: PublicationStore;
  directory: string;
  locales?: ReportLocale[];
  now?: () => Date;
  /** Verify only: nothing is written; problems are listed in `stale`. */
  check?: boolean;
  /** Remove report directories that are not part of the fresh index (older template or text versions). */
  prune?: boolean;
}
export interface ReportIndexEntry { report_id: string; run_id: string; scope: ReportScope; locale: ReportLocale; facts_digest: string; generated_at: string; artifacts: { format: 'html' | 'md'; bytes: number; sha256: string }[] }
export interface PrecomputeOutcome { reports: ReportIndexEntry[]; generated: number; reused: number; stale: string[]; pruned: string[] }

export async function precomputeReports(options: PrecomputeOptions): Promise<PrecomputeOutcome> {
  const locales = options.locales ?? ['en'];
  const files = new FileReportRepository(options.directory, { writable: !options.check });
  // In check mode anything missing is rendered into throwaway memory, only to be reported as stale.
  const service = new ReportService(options.store, { repository: options.check ? new LayeredReportRepository([files], new MemoryReportRepository()) : files, generationsPerMinute: Number.MAX_SAFE_INTEGER, ...(options.now ? { now: options.now } : {}) });
  const outcome: PrecomputeOutcome = { reports: [], generated: 0, reused: 0, stale: [], pruned: [] };
  const publications = (await options.store.publications()).items.filter(p => p.visibility === 'public_regional').sort((a, b) => a.run_id.localeCompare(b.run_id));
  for (const publication of publications) for (const locale of locales) {
    let { result } = await service.ensure({ run_id: publication.run_id, locale });
    if (result.state !== 'succeeded' || !result.representation) { outcome.stale.push(`${publication.run_id}:${locale}:failed`); continue; }
    let stored = result.representation;
    if (result.reused) {
      // A stored report must equal what the current code renders for the same generation time. When it does not,
      // the rendering changed without a new template version: reported by `check`, rewritten otherwise.
      const generatedAt = stored.generated_at;
      const fresh = await new ReportService(options.store, { repository: new MemoryReportRepository(), generationsPerMinute: Number.MAX_SAFE_INTEGER, now: () => new Date(generatedAt) }).ensure({ run_id: publication.run_id, locale });
      if (JSON.stringify(fresh.result.representation) !== JSON.stringify(stored)) {
        if (options.check) outcome.stale.push(`${publication.run_id}:${locale}:outdated`);
        else { files.remove(result.report_id); ({ result } = await service.ensure({ run_id: publication.run_id, locale })); if (!result.representation) { outcome.stale.push(`${publication.run_id}:${locale}:failed`); continue; } stored = result.representation; }
      }
    }
    if (result.reused) outcome.reused++;
    else {
      outcome.generated++;
      if (options.check) outcome.stale.push(`${publication.run_id}:${locale}:missing`);
    }
    outcome.reports.push({ report_id: result.report_id, run_id: publication.run_id, scope: stored.scope, locale: stored.resolved_locale, facts_digest: stored.facts_digest, generated_at: stored.generated_at,
      artifacts: stored.artifacts.map(a => ({ format: a.format, bytes: a.bytes, sha256: a.sha256 })) });
  }
  const expected = new Set(outcome.reports.map(r => r.report_id));
  for (const id of files.list()) {
    if (expected.has(id)) continue;
    if (options.prune && !options.check) { files.remove(id); outcome.pruned.push(id); } else outcome.stale.push(`${id}:not_in_index`);
  }
  if (!options.check) {
    mkdirSync(resolve(options.directory), { recursive: true });
    writeFileSync(resolve(options.directory, 'index.json'), `${JSON.stringify({ contract: 'simulation-technical-report-index.v1',
      generated_with: { report_schema_version: REPORT_SCHEMA_VERSION, template_version: REPORT_TEMPLATE_VERSION, translation_version: REPORT_TRANSLATION_VERSION }, reports: outcome.reports }, null, 1)}\n`);
  }
  return outcome;
}
