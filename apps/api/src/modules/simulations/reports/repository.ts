// Where report representations live. Reports are derived documents kept apart from the scientific artifacts: their
// own directory, index and identifiers; a run.json and its hash are never rewritten to attach a report.
// Semantics shared by every implementation (memory, directory, and a future database-backed one):
//   * a report is addressed by report_id, which already encodes run, sources, scope, versions, locale and profile;
//   * the first writer wins (putIfAbsent), so one request and its retries always read the same generated_at;
//   * a stored export is served only if its bytes still match the hashes recorded in the representation.
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validators, type ReportRepresentation } from '@gaiapus/contracts';

export interface StoredReport {
  report_id: string;
  run_id: string;
  representation: ReportRepresentation;
  html: string;
  markdown: string;
  /** True when the bytes survive a restart (same generated_at forever): only then may a public cache treat them as immutable. */
  durable: boolean;
}
export interface ReportFailure { code: string; attempts: number }
export interface ReportRepository {
  get(reportId: string): Promise<StoredReport | null>;
  /** Stores the report unless one already exists under the id; returns the stored one. */
  putIfAbsent(report: StoredReport): Promise<StoredReport>;
  failure(reportId: string): Promise<ReportFailure | null>;
  recordFailure(reportId: string, code: string): Promise<ReportFailure>;
  clearFailure(reportId: string): Promise<void>;
}

export const REPORT_ID = /^rep_[0-9a-f]{32}$/;
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
/** A stored report is usable only when it is contract-valid and its exports match their recorded hashes. */
export function isIntact(report: StoredReport): boolean {
  const { representation } = report;
  if (!validators.ReportRepresentation!(representation) || representation.report_id !== report.report_id || representation.run_id !== report.run_id) return false;
  const hashOf = (format: 'html' | 'md') => representation.artifacts.find(a => a.format === format)?.sha256;
  return hashOf('html') === sha256(report.html) && hashOf('md') === sha256(report.markdown);
}

class Failures {
  private readonly failures = new Map<string, ReportFailure>();
  async failure(reportId: string) { return this.failures.get(reportId) ?? null; }
  async recordFailure(reportId: string, code: string) {
    const next = { code, attempts: (this.failures.get(reportId)?.attempts ?? 0) + 1 };
    // Bounded: failures are diagnostics, not data.
    if (this.failures.size >= 1000 && !this.failures.has(reportId)) this.failures.delete(this.failures.keys().next().value!);
    this.failures.set(reportId, next);
    return next;
  }
  async clearFailure(reportId: string) { this.failures.delete(reportId); }
}

/** Process memory, bounded by bytes (least recently used first out). Not durable: a restart regenerates. */
export class MemoryReportRepository extends Failures implements ReportRepository {
  private readonly reports = new Map<string, { report: StoredReport; bytes: number }>();
  private used = 0;
  constructor(private readonly maxBytes = 64 * 1024 * 1024) { super(); }
  async get(reportId: string) {
    const hit = this.reports.get(reportId);
    if (!hit) return null;
    this.reports.delete(reportId); this.reports.set(reportId, hit);
    return hit.report;
  }
  async putIfAbsent(report: StoredReport) {
    const existing = this.reports.get(report.report_id);
    if (existing) return existing.report;
    const stored = { ...report, durable: false };
    // UTF-16 strings plus the parsed document: about four times the export sizes.
    const bytes = 4 * (report.html.length + report.markdown.length);
    if (bytes > this.maxBytes) return stored;
    this.reports.set(report.report_id, { report: stored, bytes }); this.used += bytes;
    for (const [oldest, entry] of this.reports) { if (this.used <= this.maxBytes) break; this.reports.delete(oldest); this.used -= entry.bytes; }
    return stored;
  }
  stats() { return { entries: this.reports.size, bytes: this.used }; }
}

/**
 * A directory of reports: reports/<report_id>/{report.json,report.html,report.md}. Used read-only for the
 * precomputed reports pinned in the repository and writable for a deployment that wants reports to survive restarts.
 */
export class FileReportRepository extends Failures implements ReportRepository {
  private readonly root: string;
  /** `overflow` receives what cannot be written (read-only directory or directory at its limit). */
  constructor(directory: string, private readonly options: { writable?: boolean; maxReports?: number; overflow?: ReportRepository } = {}) { super(); this.root = resolve(directory); }
  private dir(reportId: string) {
    if (!REPORT_ID.test(reportId)) throw new Error('Unexpected report id');
    const path = resolve(this.root, 'reports', reportId);
    if (!path.startsWith(this.root + sep)) throw new Error('Unexpected report path');
    return path;
  }
  async get(reportId: string): Promise<StoredReport | null> {
    return this.read(reportId) ?? (await this.options.overflow?.get(reportId)) ?? null;
  }
  private read(reportId: string): StoredReport | null {
    if (!REPORT_ID.test(reportId)) return null;
    const dir = this.dir(reportId);
    if (!existsSync(resolve(dir, 'report.json'))) return null;
    try {
      const representation = JSON.parse(readFileSync(resolve(dir, 'report.json'), 'utf8')) as ReportRepresentation;
      const report: StoredReport = { report_id: reportId, run_id: representation.run_id, representation, html: readFileSync(resolve(dir, 'report.html'), 'utf8'), markdown: readFileSync(resolve(dir, 'report.md'), 'utf8'), durable: true };
      // Tampered or truncated files are never served: the caller regenerates.
      return isIntact(report) ? report : null;
    } catch { return null; }
  }
  /** Report ids present in the directory (whatever their state). */
  list(): string[] {
    const reports = resolve(this.root, 'reports');
    return existsSync(reports) ? readdirSync(reports).filter(name => REPORT_ID.test(name)).sort() : [];
  }
  async putIfAbsent(report: StoredReport) {
    const existing = await this.get(report.report_id);
    if (existing) return existing;
    if (!this.options.writable || (this.options.maxReports !== undefined && this.list().length >= this.options.maxReports)) return this.options.overflow?.putIfAbsent(report) ?? { ...report, durable: false };
    const target = this.dir(report.report_id), staging = `${target}.${randomBytes(6).toString('hex')}.tmp`;
    mkdirSync(staging, { recursive: true });
    writeFileSync(resolve(staging, 'report.json'), `${JSON.stringify(report.representation)}\n`);
    writeFileSync(resolve(staging, 'report.html'), report.html);
    writeFileSync(resolve(staging, 'report.md'), report.markdown);
    try {
      // A directory that exists here failed the integrity check above: it is replaced, never served.
      if (existsSync(target)) rmSync(target, { recursive: true, force: true });
      renameSync(staging, target);
    } catch {
      rmSync(staging, { recursive: true, force: true });
      return this.read(report.report_id) ?? { ...report, durable: false };
    }
    return { ...report, durable: true };
  }
  remove(reportId: string) { rmSync(this.dir(reportId), { recursive: true, force: true }); }
}

/** Read-only layers first (precomputed reports), then the layer that accepts new ones. */
export class LayeredReportRepository implements ReportRepository {
  constructor(private readonly readOnly: ReportRepository[], private readonly primary: ReportRepository) {}
  async get(reportId: string) {
    for (const layer of this.readOnly) { const hit = await layer.get(reportId); if (hit) return hit; }
    return this.primary.get(reportId);
  }
  async putIfAbsent(report: StoredReport) { return (await this.get(report.report_id)) ?? this.primary.putIfAbsent(report); }
  failure(reportId: string) { return this.primary.failure(reportId); }
  recordFailure(reportId: string, code: string) { return this.primary.recordFailure(reportId, code); }
  clearFailure(reportId: string) { return this.primary.clearFailure(reportId); }
}

export const PINNED_REPORTS_DIR = fileURLToPath(new URL('../../../../data/report-publications/future-simulation-v1/', import.meta.url));
/** Default: the reports precomputed for the pinned Brazilian publication (when present), then process memory. */
export function defaultReportRepository(options: { storeDir?: string; cacheBytes?: number } = {}): ReportRepository {
  const pinned = existsSync(PINNED_REPORTS_DIR) ? [new FileReportRepository(PINNED_REPORTS_DIR)] : [];
  const memory = new MemoryReportRepository(options.cacheBytes);
  if (!options.storeDir) return new LayeredReportRepository(pinned, memory);
  return new LayeredReportRepository(pinned, new FileReportRepository(options.storeDir, { writable: true, maxReports: 5000, overflow: memory }));
}
