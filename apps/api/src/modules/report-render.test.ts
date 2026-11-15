// Task 2 of the technical reports: locale resolution, explicit formatters, five complete catalogues and a
// deterministic narrative whose language never changes a fact (plan sections 3, 5, 7 and 13).
import { describe, expect, it } from 'vitest';
import { validators, type ReportBlock, type ReportDocument, type ReportFacts, type ReportLocale, type ReportScope, type SimulationRun } from '@gaiapus/contracts';
import { PublicationStore, pinnedBrazilSource } from './simulations/publication-store.js';
import { buildReportFacts, factsDigest } from './simulations/reports/facts.js';
import { loadVerifiedReportInput } from './simulations/reports/input.js';
import { createReportFormatters } from './simulations/reports/format.js';
import { REPORT_LOCALES, resolveReportLocale } from './simulations/reports/locale.js';
import { REPORT_CATALOGS, REPORT_TRANSLATION_VERSION, createTranslator } from './simulations/reports/messages/index.js';
import { escapeMarkdown } from './simulations/reports/markdown.js';
import { DEFAULT_DISPLAY_PROFILE, renderReportWithExports } from './simulations/reports/render.js';
import { displayIndices, niceMax } from './simulations/reports/chart.js';
import { STORY_MAIZE_2027, SUMNER_WHEAT_2028, UBERLANDIA_ROTATION, brIndex, brRun, fullStore, usIndex, usRun, usWithoutSeries } from '../../tests/report-fixtures.js';

const SOY_2027: ReportScope = { kind: 'season', crop_id: 'soy', harvest_year: 2027 };
const WHOLE: ReportScope = { kind: 'run' };
const GENERATED = '2026-11-15T20:00:00.000Z';
const REPORT_ID = `rep_${'0'.repeat(32)}`;
async function render(store: PublicationStore, id: string, locale: ReportLocale, scope: ReportScope = WHOLE, timeZone = 'UTC') {
  const input = await loadVerifiedReportInput(store, id, scope);
  const facts = buildReportFacts(input);
  return { facts, ...renderReportWithExports(facts, { report_id: REPORT_ID, resolved_locale: locale, display_profile: { ...DEFAULT_DISPLAY_PROFILE, time_zone: timeZone }, generated_at: GENERATED, series: input.series.status === 'available' ? input.series.data : null }) };
}
const renderRun = (run: SimulationRun, locale: ReportLocale = 'en') => {
  const facts = buildReportFacts({ run, scope: WHOLE, visibility: 'public_regional', artifacts: [{ kind: 'run', sha256: 'a'.repeat(64), bytes: 1 }], series: { status: 'absent' } });
  return { facts, ...renderReportWithExports(facts, { report_id: REPORT_ID, resolved_locale: locale, display_profile: DEFAULT_DISPLAY_PROFILE, generated_at: GENERATED, series: null }) };
};
/** Every piece of text of a document, as a reader would meet it. */
function plain(document: ReportDocument): string {
  const spans = (s: { text: string }[]) => s.map(x => x.text).join('');
  const table = (t: Extract<ReportBlock, { type: 'table' }>) => [t.caption, ...t.columns.map(c => c.header), ...t.rows.flatMap(r => r.cells.map(spans)), ...t.notes.map(spans)];
  const block = (b: ReportBlock): string[] => (b.type === 'paragraph' ? [spans(b.content)] : b.type === 'heading' ? [b.text] : b.type === 'list' ? b.items.map(spans) : b.type === 'definitions' ? b.items.flatMap(i => [i.term, spans(i.content)])
    : b.type === 'quote' ? [b.label, spans(b.content)] : b.type === 'table' ? table(b) : [b.title, b.description, b.y_label, ...b.shapes.map(s => s.label), ...b.regions.map(r => r.label), ...table(b.table)]);
  return [document.title, document.subtitle, ...document.sections.flatMap(s => [s.title, ...s.blocks.flatMap(block)]), spans(document.footer)].join('\n');
}
const sectionText = (document: ReportDocument, id: string) => plain({ ...document, title: '', subtitle: '', footer: [], sections: document.sections.filter(s => s.id === id) });

describe('resolveReportLocale', () => {
  it.each([
    ['pt-BR', 'pt-BR', null], ['pt', 'pt-BR', null], ['pt-PT', 'pt-BR', null], ['PT_br', 'pt-BR', null], ['en', 'en', null], ['en-US', 'en', null], ['en-GB', 'en', null],
    ['es-419', 'es', null], ['fr-CA', 'fr', null], ['de-AT', 'de', null], ['ja', 'en', 'unsupported'], ['zh-Hant-TW', 'en', 'unsupported'], ['it', 'en', 'unsupported'],
    ['', 'en', 'invalid'], ['   ', 'en', 'invalid'], ['en; DROP TABLE', 'en', 'invalid'], ['<script>', 'en', 'invalid'], ['e', 'en', 'invalid'], ['123', 'en', 'invalid'], ['x'.repeat(200), 'en', 'invalid'],
  ] as const)('%j resolves to %s (%s)', (requested, resolved, reason) => {
    const out = resolveReportLocale(requested);
    expect([out.resolved_locale, out.fallback_reason]).toEqual([resolved, reason]);
    expect(validators.ReportLocaleResolution!(out)).toBe(true);
    expect(out.requested_locale!.length).toBeLessThanOrEqual(35);
  });
  it('absence is its own reason, and requested_locale is null only then', () => {
    expect(resolveReportLocale(null)).toEqual({ requested_locale: null, resolved_locale: 'en', fallback_reason: 'missing' });
    expect(resolveReportLocale(undefined)).toEqual({ requested_locale: null, resolved_locale: 'en', fallback_reason: 'missing' });
    expect(resolveReportLocale('ja').requested_locale).toBe('ja');
  });
  it('untrusted input is echoed bounded and printable, never as a formatter argument', () => {
    const out = resolveReportLocale(`fr\u0000\n<img src=x onerror=1>${'y'.repeat(300)}`);
    expect(out).toEqual({ requested_locale: `fr??<img src=x onerror=1>${'y'.repeat(10)}`, resolved_locale: 'en', fallback_reason: 'invalid' });
  });
  it('an unusable catalogue falls back to English as a whole, with its own reason', () => {
    expect(resolveReportLocale('fr', { available: l => l !== 'fr' })).toEqual({ requested_locale: 'fr', resolved_locale: 'en', fallback_reason: 'catalog_unavailable' });
    expect(resolveReportLocale('fr', { available: () => true }).resolved_locale).toBe('fr');
  });
});

describe('report catalogues', () => {
  type Node = string | { [k: string]: Node };
  const leaves = (tree: Node, prefix = ''): Map<string, string> => {
    const out = new Map<string, string>();
    if (typeof tree === 'string') { out.set(prefix, tree); return out; }
    for (const [k, v] of Object.entries(tree)) for (const [kk, vv] of leaves(v, prefix ? `${prefix}.${k}` : k)) out.set(kk, vv);
    return out;
  };
  const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  const source = leaves(REPORT_CATALOGS.en as unknown as Node);
  it('the five languages exist and English is complete', () => {
    expect(Object.keys(REPORT_CATALOGS).sort()).toEqual([...REPORT_LOCALES].sort());
    expect(source.size).toBeGreaterThan(250);
    expect(REPORT_TRANSLATION_VERSION).toMatch(/^1\.[0-9a-f]{12}$/);
  });
  it.each(['pt-BR', 'es', 'fr', 'de'] as const)('%s has every key, the same placeholders and emphasis, and no leftover English', lang => {
    const target = leaves(REPORT_CATALOGS[lang] as unknown as Node);
    expect([...source.keys()].filter(k => !target.has(k))).toEqual([]);
    expect([...target.keys()].filter(k => !source.has(k))).toEqual([]);
    expect([...source].filter(([k, v]) => vars(target.get(k)!) !== vars(v)).map(([k]) => k)).toEqual([]);
    expect([...source].filter(([k, v]) => (target.get(k)!.match(/\*\*/g)?.length ?? 0) !== (v.match(/\*\*/g)?.length ?? 0)).map(([k]) => k)).toEqual([]);
    expect([...target].filter(([, v]) => !v.trim()).map(([k]) => k)).toEqual([]);
    const hasWords = (v: string) => /[a-zà-ú]{4,}/i.test(v.replace(/\{\w+\}/g, ''));
    expect([...source].filter(([k, v]) => v.length > 30 && hasWords(v) && target.get(k) === v).map(([k]) => k)).toEqual([]);
  });
  it('a group never uses "other" as a plain key (it is reserved for plural forms)', () => {
    for (const lang of REPORT_LOCALES) expect([...leaves(REPORT_CATALOGS[lang] as unknown as Node).keys()].filter(k => k.endsWith('.other') && !leaves(REPORT_CATALOGS[lang] as unknown as Node).has(k.replace(/other$/, 'one')))).toEqual([]);
  });
  it('French uses narrow no-break spaces before ; ? !', () => {
    expect([...leaves(REPORT_CATALOGS.fr as unknown as Node)].filter(([, v]) => / [;?!]/.test(v)).map(([k]) => k)).toEqual([]);
  });
  it('no catalogue names a currency, an imperial unit or a calibrated confidence', () => {
    for (const lang of REPORT_LOCALES) {
      const all = [...leaves(REPORT_CATALOGS[lang] as unknown as Node).values()].join('\n');
      expect(all).not.toMatch(/R\$|US\$|\b(USD|BRL|EUR|acres?|bushels?|sacas?)\b|€|°F/i);
    }
  });
});

describe('explicit formatters', () => {
  const en = createReportFormatters('en', DEFAULT_DISPLAY_PROFILE), pt = createReportFormatters('pt-BR', DEFAULT_DISPLAY_PROFILE);
  it('round only for display and never show a positive value as zero (review focus 5)', () => {
    expect([en.mm(0.04507624000978585), en.mm(13.164959099152812), en.mm(74.77797564290594), en.mm(0), en.mm(0.05), en.mm(-0.01)]).toEqual(['<0.1', '13.2', '74.8', '0.0', '0.1', '>-0.1']);
    expect([pt.mm(0.04507624000978585), pt.mm(13.164959099152812), pt.kgHa(3502), pt.percent(7 / 22)]).toEqual(['<0,1', '13,2', '3.502', '31,8%']);
    expect([en.days(6.5), en.days(0), en.kgHa(5406.2), en.percent(7 / 22), en.percent(0), en.percent(0.0001)]).toEqual(['6.5', '0.0', '5,406', '31.8%', '0.0%', '<0.1%']);
    expect(en.belowPrecision(0.04507624000978585, 'mm')).toBe(true);
    expect(en.belowPrecision(0, 'mm')).toBe(false);
  });
  it('calendar dates never shift with the display time zone; instants name their zone', () => {
    for (const zone of ['UTC', 'Pacific/Kiritimati', 'America/Los_Angeles', 'Pacific/Pago_Pago']) {
      const f = createReportFormatters('en', { time_zone: zone, units: 'canonical_metric' });
      expect([f.date('2027-02-28'), f.date('2026-11-05'), f.date('2028-02-29')]).toEqual(['28 February 2027', '5 November 2026', '29 February 2028']);
    }
    expect(en.instant('2026-08-31T23:59:00+00:00')).toBe('31 August 2026 at 23:59 UTC');
    expect(createReportFormatters('en', { time_zone: 'America/Sao_Paulo', units: 'canonical_metric' }).instant('2026-08-31T23:59:00+00:00')).toBe('31 August 2026 at 20:59 GMT-3');
    expect(createReportFormatters('de', DEFAULT_DISPLAY_PROFILE).instant('2026-08-31T23:59:00+00:00')).toContain('31. August 2026');
    expect([en.years([2017, 2018, 2019, 2020, 2021]), en.years([2019, 2021])]).toEqual(['2017–2021', '2019 and 2021']);
  });
});

describe('the Uberlândia example (plan section 11)', () => {
  it('says in English what the plan asks for, with the exact figures', async () => {
    const { representation, facts } = await render(fullStore(), UBERLANDIA_ROTATION, 'en', SOY_2027);
    expect(validators.ReportRepresentation!(representation), JSON.stringify(validators.ReportRepresentation!.errors?.slice(0, 3))).toBe(true);
    const doc = representation.document, summary = sectionText(doc, 'summary'), all = plain(doc);
    expect(doc.title).toBe('Technical simulation report — Uberlândia, soybean, harvest 2027');
    expect([doc.lang, representation.resolved_locale, representation.display_profile.time_zone]).toEqual(['en', 'en', 'UTC']);
    const identification = sectionText(doc, 'identification');
    expect(identification).toContain('Data cutoff\n31 August 2026 at 23:59 UTC');
    expect(identification).toContain('Simulation issued\n15 November 2026 at 13:41 UTC');
    expect(identification).toContain('Report generated\n15 November 2026 at 20:00 UTC');
    expect(identification).toContain('it is not a daily weather forecast for 2027');
    expect(identification).toContain('Regional (municipality or county). The results do not describe an individual field.');
    expect(summary).toContain('Across 22 scenarios, the seasonal crop evapotranspiration deficit of soybean 2026/2027 has a median of 13.2 mm, with P10 <0.1 mm and P90 74.8 mm.');
    expect(summary).toContain('positive but below the displayed precision');
    expect(summary).toContain('not a recommended irrigation depth');
    expect(summary).toContain('7 of 22 scenarios (31.8%)');
    expect(summary).toContain('not a calibrated probability');
    expect(summary).toContain('historical municipal yield reference of 3,502 kg/ha, calculated from 2017–2021 data');
    expect(summary).toContain('independent of the simulated weather scenarios');
    expect(summary).toContain('Soil water storage capacity was assumed to be 55 mm');
    expect(all).toContain('Economic analysis unavailable: this result does not include prices, costs and an integrated budget.');
    // The positive P10 is never printed as zero, in the summary or in the table.
    const deficitRow = (doc.sections.find(s => s.id === 'results')!.blocks.find(b => b.type === 'table') as Extract<ReportBlock, { type: 'table' }>).rows.find(r => r.cells[0]![0]!.text.includes('ETc − ETa'))!;
    expect(deficitRow.cells.map(c => c[0]!.text).slice(2)).toEqual(['<0.1', '13.2', '74.8', '22']);
    expect(facts.seasons[0]!.metrics.find(m => m.metric_id === 'crop_deficit_mm')!.p10).toBe(0.04507624000978585);
    // Interpolated day counts stay fractional and are explained.
    expect(all).toContain('can be fractional (9.5 days)');
    expect(all).toContain('P50(ETc) − P50(ETa) need not equal P50(deficit)');
    // The source file goes beyond the cutoff (review focus 4): the report says which period was used.
    const methods = sectionText(doc, 'methods');
    expect(methods).toContain('covers dates until 14 November 2026, after the data cutoff. That does not show that later dates were used');
    expect(methods).toMatch(/Observed\n1 January 2025\n31 August 2026/);
  });

  it('conclusions and next steps keep their evidence, and every summary block points at facts', async () => {
    const { representation, facts } = await render(fullStore(), UBERLANDIA_ROTATION, 'en', SOY_2027);
    expect(representation.conclusions).toEqual(facts.conclusions);
    expect(representation.conclusions.map(c => c.code)).toEqual(['water_deficit_season', 'event_frequency', 'yield_overview']);
    expect(representation.actions.map(a => a.code)).toEqual(['check_soil_capacity', 'check_recent_yield_data', 'request_paired_management_run']);
    const summary = representation.document.sections.find(s => s.id === 'summary')!;
    const lists = summary.blocks.filter(b => b.type === 'list');
    expect(lists.map(l => l.type === 'list' && l.items.length)).toEqual([3, 3]);
    expect(summary.blocks.filter(b => b.type === 'paragraph' && b.evidence_ids?.length).length).toBeGreaterThanOrEqual(3);
    expect(plain(representation.document)).not.toMatch(/\b(safe|guaranteed|confidence score of)\b/i);
  });

  it('the whole-run report names the season with the largest deficit and lists every yield', async () => {
    const { representation } = await render(fullStore(), UBERLANDIA_ROTATION, 'en');
    const summary = sectionText(representation.document, 'summary');
    expect(representation.document.subtitle).toBe('Whole run — 4 crop seasons');
    expect(representation.document.title).toBe('Technical simulation report — Uberlândia, soybean and second-season maize, harvests 2027 and 2028');
    expect(summary).toContain('Among the 4 crop seasons of this report, second-season maize 2027 has the largest median seasonal crop evapotranspiration deficit: 154.1 mm, with P10 101.8 mm and P90 210.3 mm, across 22 scenarios.');
    expect(summary).toContain('21 of 22 scenarios (95.5%)');
    expect(summary).toContain('Second-season maize 2027: historical municipal yield reference of 5,406 kg/ha');
    expect(representation.conclusions.map(c => c.code)).toEqual(['water_deficit_highest', 'event_frequency', 'yield_overview']);
    expect(representation.document.sections.map(s => s.id)).toEqual(['identification', 'summary', 'results', 'charts', 'yield_economics', 'methods']);
  });
});

describe('language changes the wording and nothing else', () => {
  it('five languages share the facts digest, the codes, the evidence and the canonical units', async () => {
    const store = fullStore();
    const rendered = await Promise.all(REPORT_LOCALES.map(l => render(store, UBERLANDIA_ROTATION, l, SOY_2027)));
    expect(new Set(rendered.map(r => r.representation.facts_digest)).size).toBe(1);
    expect(rendered[0]!.representation.facts_digest).toBe(factsDigest(rendered[0]!.facts));
    expect(new Set(rendered.map(r => JSON.stringify([r.representation.conclusions, r.representation.caveat, r.representation.actions, r.representation.sections, r.representation.source_hashes, r.representation.run_id]))).size).toBe(1);
    expect(new Set(rendered.map(r => r.representation.document.title)).size).toBe(5);
    expect(rendered.map(r => r.representation.document.lang)).toEqual([...REPORT_LOCALES]);
    for (const r of rendered) {
      const all = plain(r.representation.document);
      expect(all).toContain('kg/ha');
      expect(all).toContain(' mm');
      expect(all).not.toMatch(/R\$|US\$|\b(USD|BRL|EUR|acres?|bushels?)\b|€|°F/);
      expect(all).toContain(UBERLANDIA_ROTATION);
      // No message key leaked instead of a sentence, in any language.
      expect(all.match(/\b[a-z]+(?:\.[a-zA-Z0-9_]+){1,3}\b(?<!\d)/g)?.filter(k => /^(title|subtitle|section|sectionReason|common|crop|phase|weatherKind|identification|outputMode|scientificStatus|summary|conclusion|caveat|action|results|metric|event|charts|yield|researchStatus|yieldStatus|position|reason|methods|text|methodName|limitation|footer)\./.test(k)) ?? []).toEqual([]);
    }
    const [pt, , es, fr, de] = rendered.map(r => plain(r.representation.document));
    expect(pt).toContain('13,2 mm'); expect(pt).toContain('<0,1 mm'); expect(pt).toContain('3.502 kg/ha'); expect(pt).toContain('7 de 22 cenários (31,8%)'); expect(pt).toContain('31 de agosto de 2026');
    expect(es).toContain('13,2 mm'); expect(es).toContain('7 de 22 escenarios');
    expect(fr).toContain('13,2 mm'); expect(fr).toContain('7 scénarios sur 22');
    expect(de).toContain('13,2 mm'); expect(de).toContain('3.502 kg/ha'); expect(de).toContain('7 von 22 Szenarien');
  });

  it('requests that resolve to English share one artifact; the fallback reason stays in each envelope, not in the artifact', async () => {
    const store = fullStore();
    const resolutions = [resolveReportLocale(null), resolveReportLocale('en'), resolveReportLocale('ja'), resolveReportLocale('!!'), resolveReportLocale('fr', { available: () => false })];
    expect(resolutions.map(r => r.fallback_reason)).toEqual(['missing', null, 'unsupported', 'invalid', 'catalog_unavailable']);
    const outputs = await Promise.all(resolutions.map(r => render(store, UBERLANDIA_ROTATION, r.resolved_locale, SOY_2027)));
    expect(new Set(outputs.map(o => o.html)).size).toBe(1);
    expect(new Set(outputs.map(o => JSON.stringify(o.representation))).size).toBe(1);
    expect(outputs[0]!.html).not.toMatch(/fallback|unsupported|catalog_unavailable/);
    // English as a whole: no French heading over English explanations.
    expect(outputs[4]!.representation.document.lang).toBe('en');
    expect(outputs[4]!.representation.document.sections.map(s => s.title)).toEqual(outputs[1]!.representation.document.sections.map(s => s.title));
  });

  it('a display time zone changes how instants read, is recorded, and changes no fact', async () => {
    const store = fullStore();
    const utc = await render(store, UBERLANDIA_ROTATION, 'en', SOY_2027), sp = await render(store, UBERLANDIA_ROTATION, 'en', SOY_2027, 'America/Sao_Paulo');
    expect(sp.representation.display_profile).toEqual({ time_zone: 'America/Sao_Paulo', units: 'canonical_metric' });
    expect(sp.representation.facts_digest).toBe(utc.representation.facts_digest);
    expect(sectionText(sp.representation.document, 'identification')).toContain('31 August 2026 at 20:59 GMT-3');
    expect(sectionText(sp.representation.document, 'identification')).toContain('5 November 2026');
    expect(sectionText(sp.representation.document, 'results')).toBe(sectionText(utc.representation.document, 'results'));
  });
});

describe('partial runs, yield variants and missing data in the narrative', () => {
  it('a run with a modelled yield and no series gives a useful report without charts or invented curves', async () => {
    const store = new PublicationStore([pinnedBrazilSource(), usWithoutSeries(SUMNER_WHEAT_2028)]);
    const { representation, html, markdown } = await render(store, SUMNER_WHEAT_2028, 'en');
    expect(validators.ReportRepresentation!(representation)).toBe(true);
    const doc = representation.document, charts = doc.sections.find(s => s.id === 'charts')!;
    expect([charts.status, charts.reason_code]).toEqual(['unavailable', 'no_series_artifact']);
    expect(charts.blocks.map(b => b.type)).toEqual(['paragraph']);
    expect(sectionText(doc, 'charts')).toContain('Daily series are not published for this run, so no chart or trajectory is shown.');
    expect(html).not.toContain('<svg');
    const y = sectionText(doc, 'yield_economics');
    expect(y).toContain('3,571 kg/ha');
    expect(y).toContain('research_us_v2/product/KS_wheat_winter_shared');
    expect(y).toContain('P10 2,697 · P50 3,571 · P90 3,778 kg/ha — spread of the scenarios, not calibrated');
    expect(y).toContain('P10 2,601 · P50 3,571 · P90 4,525 kg/ha — median plus quantiles of the errors seen in development');
    expect(y).toContain('county — not an estimate for a field or a farm');
    expect(y).toContain('A research status, even when confirmed, does not make this an operational result or a recommendation.');
    expect(sectionText(doc, 'summary')).toContain('Winter wheat 2027/2028: modelled yield of 3,571 kg/ha (county scale; status: gain confirmed in the 2025 season)');
    expect(sectionText(doc, 'results')).toContain('245.5');
    expect(markdown).toContain('3,571 kg/ha');
    expect(representation.source_hashes.map(s => s.kind)).toEqual(['run']);
  });

  it('a US run with its series shows only what it publishes, quotes untranslated source rules and says so', async () => {
    const { representation } = await render(fullStore(), STORY_MAIZE_2027, 'pt-BR');
    const doc = representation.document, all = plain(doc);
    expect(doc.lang).toBe('pt-BR');
    for (const absent of [REPORT_CATALOGS['pt-BR'].metric.crop_etc_mm, REPORT_CATALOGS['pt-BR'].metric.mean_storage_mm, REPORT_CATALOGS['pt-BR'].metric.stress_days]) expect(sectionText(doc, 'results')).not.toContain(absent);
    expect(all).toContain('NASS county estimates: corn/soy crop year Y released in May of Y+1');
    expect(sectionText(doc, 'summary')).toContain('sem tradução');
    expect(doc.sections.find(s => s.id === 'methods')).toMatchObject({ status: 'partial', reason_code: 'untranslated_source_notes' });
    expect(doc.sections.find(s => s.id === 'charts')!.blocks.filter(b => b.type === 'chart').length).toBe(2);
  });

  it('an unavailable yield is explained with its reason and never replaced by a number', async () => {
    const { representation } = await render(fullStore(), 'sim_9cd555885306ffcd15715546', 'en');
    const y = sectionText(representation.document, 'yield_economics');
    expect(y).toContain('Yield unavailable: data source unavailable. No substitute value is shown.');
    expect(y).not.toMatch(/\d[\d,.]* kg\/ha/);
    expect(sectionText(representation.document, 'summary')).toContain('Yield is unavailable for soybean 2026/2027 and soybean 2027/2028: data source unavailable.');
    expect(representation.document.sections.find(s => s.id === 'yield_economics')).toMatchObject({ status: 'unavailable', reason_code: 'yield_and_economics_unavailable' });
  });

  it('an in-season forecast run does not receive the historical-scenario sentence', () => {
    const run = structuredClone(brRun(UBERLANDIA_ROTATION));
    run.output_mode = 'in_season_forecast';
    const text = sectionText(renderRun(run).representation.document, 'identification');
    expect(text).not.toContain('it is not a daily weather forecast for');
    expect(text).toContain('beyond them the weather is a scenario and not a forecast');
    expect(text).toContain('In-season forecast');
  });

  it('unknown legacy limitation text is quoted as original evidence and announced in the report language', () => {
    const run = structuredClone(brRun(UBERLANDIA_ROTATION));
    run.limitations.push('Calibrated only for <b>clay</b> soils | see [notes](javascript:alert(1))');
    const { representation, html, markdown } = renderRun(run, 'de');
    const quote = representation.document.sections.find(s => s.id === 'methods')!.blocks.find(b => b.type === 'quote');
    expect(quote).toEqual({ type: 'quote', label: 'Originaltext der Quelle (nicht übersetzt)', content: [{ text: 'Calibrated only for <b>clay</b> soils | see [notes](javascript:alert(1))' }] });
    expect(sectionText(representation.document, 'summary')).toContain('ohne Übersetzung');
    // Known limitations stay translated next to it: the narrative language does not change.
    expect(sectionText(representation.document, 'methods')).toContain('Die Bodenspeicherkapazität ist eine Annahme.');
    expect(html).toContain('Calibrated only for &lt;b&gt;clay&lt;/b&gt; soils | see [notes](javascript:alert(1))');
    expect(html).not.toContain('<b>clay');
    expect(markdown).toContain('Calibrated only for \\<b\\>clay\\</b\\> soils \\| see \\[notes\\](javascript\\:alert(1))');
  });

  it('unknown metrics and inconsistent events are shown as such, never interpreted', () => {
    const run = structuredClone(brRun(UBERLANDIA_ROTATION));
    run.seasons[0]!.quantiles.heat_index = { p10: 900, p50: 950.25, p90: 999, n: 22 };
    run.seasons[0]!.events[0]!.share_of_members = 0.33;
    const { representation } = renderRun(run);
    const results = sectionText(representation.document, 'results');
    expect(results).toContain('Indicators without a registered definition');
    expect(results).toContain('heat_index\n900\n950.25\n999\n22');
    expect(results).toContain('count not derivable (share inconsistent with 22 scenarios)');
    expect(representation.document.sections.find(s => s.id === 'results')).toMatchObject({ status: 'partial', reason_code: 'unknown_metrics_present' });
    expect(representation.warnings.map(w => w.code)).toEqual(expect.arrayContaining(['unknown_metric', 'event_share_inconsistent']));
  });
});

describe('charts: representative members only', () => {
  it('draw the published band and three whole members, and give each chart a table with the published values', async () => {
    const { representation, facts, html } = await render(fullStore(), UBERLANDIA_ROTATION, 'en', SOY_2027);
    const section = representation.document.sections.find(s => s.id === 'charts')!;
    const charts = section.blocks.filter((b): b is Extract<ReportBlock, { type: 'chart' }> => b.type === 'chart');
    expect(charts.map(c => c.chart_id)).toEqual(['season:soy:2027:storage', 'season:soy:2027:deficit']);
    expect(charts[0]!.shapes.map(s => [s.kind, s.role])).toEqual([['area', 'band'], ['line', 'capacity'], ['line', 'central'], ['line', 'dry'], ['line', 'wet']]);
    expect(charts[0]!.shapes[0]!.label).toBe('Daily P10–P90 band of the scenarios (not a trajectory)');
    expect(charts[1]!.shapes.map(s => s.role)).toEqual(['central', 'dry', 'wet']);
    for (const shape of charts.flatMap(c => c.shapes)) expect(shape.d).toMatch(/^[MLZ0-9.,-]+$/);
    expect(charts[0]!.regions.map(r => r.label)).toEqual(['establishment', 'vegetative', 'reproductive', 'maturation']);
    // The deficit table is the published value of each member, not a number derived from the drawing.
    const trajectories = facts.seasons[0]!.trajectories!;
    expect(charts[1]!.table.rows.map(r => r.cells[2]![0]!.text)).toEqual(trajectories.map(t => createReportFormatters('en', DEFAULT_DISPLAY_PROFILE).mm(t.season_deficit_mm!)));
    const text = sectionText(representation.document, 'charts');
    expect(text).toContain('It need not coincide with the median of each day.');
    expect(text).toContain('never computed from these three');
    expect(text).toContain('chosen once for the whole run');
    expect(text).toContain('no point was removed');
    expect(text).not.toMatch(/P10 scenario is|member P10/);
    expect(html.match(/<svg viewBox="0 0 720 300" role="img"/g)!.length).toBe(2);
  });
  it('the axis maximum covers the data and gives tick labels that are exact at one decimal', () => {
    expect([55, 18.84, 211.6, 289.8, 456, 0, 1, 9.9, 100].map(niceMax)).toEqual([60, 20, 240, 320, 480, 1.2, 1.2, 10, 120]);
    for (const value of [0.3, 1, 3.3, 7, 12.5, 55, 61, 99, 455, 1234]) { const max = niceMax(value); expect(max).toBeGreaterThanOrEqual(value); expect(Number((max / 4).toFixed(1))).toBeCloseTo(max / 4, 9); }
  });
  it('a long line is reduced by keeping the extremes of each interval', () => {
    const values = Array.from({ length: 2000 }, (_, i) => Math.sin(i / 7) * 10 + (i === 777 ? 500 : 0) - (i === 1234 ? 500 : 0));
    const kept = displayIndices(values, 400);
    expect(kept.length).toBeLessThanOrEqual(402);
    expect(kept).toEqual(expect.arrayContaining([0, 777, 1234, 1999]));
    expect(displayIndices([1, 2, 3], 400)).toEqual([0, 1, 2]);
  });
});

describe('HTML and Markdown exports', () => {
  it('carry the same values and caveats as the document, in a self-contained and inert form', async () => {
    const { representation, html, markdown } = await render(fullStore(), UBERLANDIA_ROTATION, 'pt-BR');
    expect(html.startsWith('<!doctype html>\n<html lang="pt-BR" dir="ltr">')).toBe(true);
    expect(html.match(/<h1>/g)!.length).toBe(1);
    expect(html.match(/<h2 id="h-/g)!.length).toBe(6);
    expect(html).toMatch(/<table><caption>[^<]+<\/caption><thead><tr><th scope="col">/);
    expect(html).toContain('<th scope="row">');
    for (const forbidden of ['<script', 'javascript:', '<img', '<iframe', '<link', 'http://', 'https://', ' src=', ' href=', ' style=', 'onerror', 'onload', '@import', 'url(']) expect(html, forbidden).not.toContain(forbidden);
    expect(markdown).not.toMatch(/(^|[^\\])<[a-zA-Z!/]/);
    expect(markdown).not.toContain('![');
    expect(markdown).not.toMatch(/\]\(/);
    for (const value of ['154,1 mm', '21 de 22 cenários (95,5%)', '5.406 kg/ha', '3.502 kg/ha', '55 mm', UBERLANDIA_ROTATION, representation.facts_digest]) {
      expect(html, value).toContain(value);
      expect(markdown.replaceAll('\\', ''), value).toContain(value);
    }
    for (const caveat of ['não é uma probabilidade calibrada', 'Análise econômica indisponível', 'não é uma previsão meteorológica diária']) { expect(html).toContain(caveat); expect(markdown).toContain(caveat); }
    expect(representation.artifacts.map(a => [a.format, a.mime_type])).toEqual([['html', 'text/html; charset=utf-8'], ['md', 'text/markdown; charset=utf-8']]);
    expect(representation.artifacts[0]!.bytes).toBe(Buffer.byteLength(html));
  });

  it('escape hostile text from a run in both exports', () => {
    const run = structuredClone(brRun(UBERLANDIA_ROTATION));
    run.place_name = '<img src=x onerror=alert(1)> [x](javascript:alert(1)) `c` | *b* https://evil.example www.evil.example';
    run.state_code = '"><script>alert(2)</script>';
    run.soil.profile_id = 'AD4`<svg onload=alert(3)>';
    const { html, markdown } = renderRun(run);
    for (const raw of ['<img', '<script', '<svg onload', 'onerror=alert(1)>']) expect(html, raw).not.toContain(raw);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('href');
    expect(markdown).not.toMatch(/(^|[^\\])<[a-zA-Z!/]/m);
    expect(markdown).not.toMatch(/(^|[^\\])\]\(/);
    expect(markdown).not.toContain('https://');
    expect(markdown).not.toMatch(/(^|[^\\])www\.evil/);
    expect(escapeMarkdown('a_b*c [d] <e> `f` | g javascript:x() https://h')).toBe('a\\_b\\*c \\[d\\] \\<e\\> \\`f\\` \\| g javascript\\:x() https:\\/\\/h');
  });

  it('is deterministic: the same facts and options give the same bytes', async () => {
    const a = await render(fullStore(), UBERLANDIA_ROTATION, 'fr'), b = await render(fullStore(), UBERLANDIA_ROTATION, 'fr');
    expect(a.html).toBe(b.html);
    expect(a.markdown).toBe(b.markdown);
    expect(a.representation).toEqual(b.representation);
  });
});

describe('every published run renders in every language', () => {
  it('valid against the contract, with the six sections and no unresolved key', async () => {
    const store = fullStore();
    for (const id of [...brIndex.publications, ...usIndex.publications].map(p => p.run_id)) for (const locale of REPORT_LOCALES) {
      const { representation } = await render(store, id, locale);
      expect(validators.ReportRepresentation!(representation), `${id} ${locale} ${JSON.stringify(validators.ReportRepresentation!.errors?.slice(0, 2))}`).toBe(true);
      expect(representation.document.sections.length).toBe(6);
      expect(plain(representation.document)).not.toMatch(/\b(conclusion|caveat|action|results|charts|yield|methods|summary|identification|common)\.[a-zA-Z_]+\b/);
    }
    expect(createTranslator('fr').text('section.summary')).not.toBe(createTranslator('en').text('section.summary'));
    expect(usRun(STORY_MAIZE_2027).seasons.length).toBe(1);
  });
});
