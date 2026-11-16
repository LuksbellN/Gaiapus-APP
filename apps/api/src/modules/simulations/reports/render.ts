// One representation of the facts: the document in a resolved locale and display profile, with the hashes of its
// HTML and Markdown exports. Rendering is a pure function of (facts, options): the same input gives the same bytes.
import { createHash } from 'node:crypto';
import type { ReportDisplayProfile, ReportFacts, ReportLocale, ReportRepresentation, SimulationSeries } from '@gaiapus/contracts';
import { buildDocument } from './document.js';
import { factsDigest } from './facts.js';
import { createReportFormatters } from './format.js';
import { documentToHtml } from './html.js';
import { documentToMarkdown } from './markdown.js';
import { REPORT_TRANSLATION_VERSION, createTranslator } from './messages/index.js';
import { REPORT_SCHEMA_VERSION, REPORT_TEMPLATE_VERSION } from './registry.js';

export const DEFAULT_DISPLAY_PROFILE: ReportDisplayProfile = { time_zone: 'UTC', units: 'canonical_metric' };
export const MIME = { html: 'text/html; charset=utf-8', md: 'text/markdown; charset=utf-8' } as const;

/** Everything about one rendering that is not a fact: captured when the request is accepted, never read later. */
export interface ReportRenderOptions {
  report_id: string;
  resolved_locale: ReportLocale;
  display_profile: ReportDisplayProfile;
  generated_at: string;
  /** Verified series of the representative members (chart geometry); null when the report has none. */
  series: SimulationSeries | null;
}
export interface RenderedReport { representation: ReportRepresentation; html: string; markdown: string }

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

export function renderReportWithExports(facts: ReportFacts, options: ReportRenderOptions): RenderedReport {
  const digest = factsDigest(facts);
  const document = buildDocument({ facts, t: createTranslator(options.resolved_locale), f: createReportFormatters(options.resolved_locale, options.display_profile),
    report_id: options.report_id, facts_digest: digest, generated_at: options.generated_at, translation_version: REPORT_TRANSLATION_VERSION, series: options.series });
  const html = documentToHtml(document), markdown = documentToMarkdown(document);
  const representation: ReportRepresentation = {
    contract: 'simulation-technical-report.v1', report_id: options.report_id, run_id: facts.run.run_id, scope: facts.scope, facts_digest: digest,
    source_hashes: facts.sources.map(s => ({ kind: s.kind, sha256: s.sha256 })),
    report_schema_version: REPORT_SCHEMA_VERSION, template_version: REPORT_TEMPLATE_VERSION, translation_version: REPORT_TRANSLATION_VERSION,
    resolved_locale: options.resolved_locale, display_profile: options.display_profile, generated_at: options.generated_at,
    sections: facts.sections, conclusions: [...facts.conclusions], caveat: facts.caveat, actions: [...facts.actions], warnings: facts.warnings, document,
    artifacts: [{ format: 'html', mime_type: MIME.html, bytes: Buffer.byteLength(html, 'utf8'), sha256: sha256(html) }, { format: 'md', mime_type: MIME.md, bytes: Buffer.byteLength(markdown, 'utf8'), sha256: sha256(markdown) }],
  };
  return { representation, html, markdown };
}

export function renderReport(facts: ReportFacts, options: ReportRenderOptions): ReportRepresentation {
  return renderReportWithExports(facts, options).representation;
}
