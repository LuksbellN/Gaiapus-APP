// Measures report generation on the seven pinned Brazilian runs: time and bytes of a new representation, and the
// time of a reuse (cache hit), in process and through the HTTP layer (Fastify inject, no network).
// Usage (from apps/api): pnpm exec tsx scripts/measure-reports.ts
// The numbers describe the machine they were taken on; they are observations, not a performance target.
import { cpus, platform, release, totalmem } from 'node:os';
import { createApp } from '../src/app.js';
import { PublicationStore, pinnedBrazilSource } from '../src/modules/simulations/publication-store.js';
import { REPORT_LOCALES } from '../src/modules/simulations/reports/locale.js';
import { MemoryReportRepository } from '../src/modules/simulations/reports/repository.js';
import { ReportService } from '../src/modules/simulations/reports/service.js';

const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]!; };
const max = (values: number[]) => Math.max(...values);
const round = (value: number) => Math.round(value * 100) / 100;
const timed = async <T>(run: () => Promise<T>) => { const start = performance.now(); const value = await run(); return { value, ms: performance.now() - start }; };
const unlimited = { generationsPerMinute: Number.MAX_SAFE_INTEGER };

const coldStore = new PublicationStore([pinnedBrazilSource()]);
const runs = (await coldStore.publications()).items;
const rows = [];
for (const publication of runs) {
  // 1. First report of a run in a new process: includes reading, hashing and inflating the artifacts.
  const first = await timed(() => new ReportService(coldStore, { ...unlimited, repository: new MemoryReportRepository() }).ensure({ run_id: publication.run_id, locale: 'en' }));
  // 2. New representations with the artifacts already verified in memory (what a second language costs).
  const generation: number[] = [], byLocale: Record<string, { html: number; md: number; json: number }> = {};
  for (let i = 0; i < 20; i++) for (const locale of REPORT_LOCALES) {
    const { value, ms } = await timed(() => new ReportService(coldStore, { ...unlimited, repository: new MemoryReportRepository() }).ensure({ run_id: publication.run_id, locale }));
    generation.push(ms);
    const representation = value.result.representation!;
    byLocale[locale] = { html: representation.artifacts[0]!.bytes, md: representation.artifacts[1]!.bytes, json: Buffer.byteLength(JSON.stringify(representation)) };
  }
  // 3. Reuse: the same request again.
  const service = new ReportService(coldStore, { ...unlimited, repository: new MemoryReportRepository() });
  await service.ensure({ run_id: publication.run_id, locale: 'en' });
  const hits: number[] = [];
  for (let i = 0; i < 200; i++) { const { value, ms } = await timed(() => service.ensure({ run_id: publication.run_id, locale: 'en' })); if (!value.result.reused) throw new Error('expected a reuse'); hits.push(ms); }
  rows.push({ run_id: publication.run_id, place: publication.place_name, plan: publication.plan_id, seasons: ((await coldStore.run(publication.run_id)) as unknown as { seasons: unknown[] }).seasons.length,
    first_report_ms: round(first.ms), generation_ms_median: round(median(generation)), generation_ms_max: round(max(generation)), reuse_ms_median: round(median(hits)), reuse_ms_max: round(max(hits)),
    bytes_en: byLocale.en, bytes_html_by_locale: Object.fromEntries(Object.entries(byLocale).map(([l, b]) => [l, b.html])) });
}

// HTTP layer with the default application (pinned reports first): POST reuse of a pinned report, POST of a new variant, GET exports.
const app = createApp({ simulations: new PublicationStore([pinnedBrazilSource()]) });
const http = { post_pinned_reuse_ms: [] as number[], post_new_variant_ms: [] as number[], get_html_ms: [] as number[], get_md_ms: [] as number[], get_json_ms: [] as number[] };
for (const publication of runs) {
  const url = `/v1/simulations/${publication.run_id}/report`;
  const created = await timed(() => app.inject({ method: 'POST', url, payload: { locale: 'pt-BR' } }));
  http.post_new_variant_ms.push(created.ms);
  const id = created.value.json().data.report_id as string;
  for (let i = 0; i < 30; i++) {
    http.post_pinned_reuse_ms.push((await timed(() => app.inject({ method: 'POST', url, payload: {} }))).ms);
    for (const format of ['html', 'md', 'json'] as const) http[`get_${format}_ms`].push((await timed(() => app.inject(`${url}?report_id=${id}&format=${format}`))).ms);
  }
}
await app.close();

console.log(JSON.stringify({
  environment: { node: process.version, platform: `${platform()} ${release()}`, cpu: cpus()[0]?.model.trim(), logical_cpus: cpus().length, memory_gb: Math.round(totalmem() / 2 ** 30), measured_at: new Date().toISOString(),
    note: 'shared developer machine with other processes running; single measurement session' },
  per_run: rows,
  totals: { runs: rows.length, generation_ms_median_of_medians: round(median(rows.map(r => r.generation_ms_median))), generation_ms_max: round(max(rows.map(r => r.generation_ms_max))), reuse_ms_median_of_medians: round(median(rows.map(r => r.reuse_ms_median))),
    first_report_ms_median: round(median(rows.map(r => r.first_report_ms))), first_report_ms_max: round(max(rows.map(r => r.first_report_ms))) },
  http_inject: Object.fromEntries(Object.entries(http).map(([k, v]) => [k, { median: round(median(v)), max: round(max(v)), samples: v.length }])),
}, null, 1));
