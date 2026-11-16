// Field Shift v2 — three historical strategies of one pinned package. Every number on screen is a published value
// or the published year-by-year pairing recomputed for the reference chosen here; nothing is estimated in the browser.
// The two exposure rows are a count and a sum over the published daily columns (sim/field-shift-exposure.ts).
import { useMemo } from 'react';
import type { FieldShiftPackage } from '../adapters';
import { n0, nMax, signed } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { Seg } from '../ui';
import { PhaseTimeline } from '../ui/PhaseTimeline';
import { buildExposure, EXPOSURE_METRICS } from '../sim/field-shift-exposure';
import { buildComparison, GROUPS, STRATEGIES, STRATEGY_LETTER, type GroupId, type MetricId, type PairStat, type PublishedComparison, type RainPoint, type StrategyId } from '../sim/field-shift-decision';

export const DEFAULT_GROUPS: GroupId[] = ['cover', 'common', 'soy', 'maize', 'own'];
const V1_METRICS: MetricId[] = ['covered_days', 'storage_at_next_sowing_mm', 'off_season_water_use_mm', 'off_season_drainage_mm', 'soy_deficit_mm', 'next_soy_establishment_deficit_mm', 'maize_deficit_mm', 'maize_stress_days'];
const NOT_KEYS = ['yield', 'soil_carbon', 'infiltration', 'weeds', 'nitrogen', 'pests_and_nematodes', 'costs_and_margin'];

export const isStrategy = (v: string | null): v is StrategyId => STRATEGIES.includes(v as StrategyId);
export function useStrategyNames() {
  const { t } = useI18n();
  const name = (s: StrategyId) => t(`fieldShift.v2.name.${s}` as MessageKey);
  return { name, full: (s: StrategyId) => `${STRATEGY_LETTER[s]} · ${name(s)}`, letter: (s: StrategyId) => STRATEGY_LETTER[s] };
}
export function useMetricLabel() {
  const { t } = useI18n();
  return (k: MetricId) => t((V1_METRICS.includes(k) ? `fieldShift.metric.${k}` : `fieldShift.v2.metric.${k}`) as MessageKey);
}

/** The three strategies, what each one is, and the reference the differences are taken against. */
export function StrategyOverview({ pkg, reference, onReference }: { pkg: FieldShiftPackage; reference: StrategyId; onReference: (s: StrategyId) => void }) {
  const { t } = useI18n(); const names = useStrategyNames();
  return (
    <section className="card" data-testid="fs-strategies">
      <ul className="plain stack-2">{STRATEGIES.map((s) => <li key={s} data-strategy={s}><b>{names.full(s)}</b> — {t(`fieldShift.v2.sequence.${s}` as MessageKey)} <span className="meta-13">({t(`fieldShift.v2.kind.${pkg.summary.scenarios[s].kind}` as MessageKey)})</span></li>)}</ul>
      <Seg legend={t('fieldShift.v2.reference.legend')} name="ref" value={reference} onChange={onReference} options={STRATEGIES.map((s) => ({ value: s, label: names.full(s) }))} />
      <p className="meta-13">{t('fieldShift.v2.reference.note')}</p>
    </section>
  );
}

function Delta({ stat }: { stat: PairStat | null }) {
  const { t } = useI18n();
  if (!stat || stat.mean == null) return <span aria-hidden>—</span>;
  const fmt = (v: number) => signed(Math.abs(v) < 0.05 ? 0 : v, 1); // one decimal on screen: a rounded zero carries no sign
  const min = fmt(stat.min ?? 0), max = fmt(stat.max ?? 0);
  return <><b>{fmt(stat.mean)}</b>{min !== max && <span className="meta-13 block">{t('fieldShift.v2.table.range', { min, max })}</span>}</>;
}

/** Means of the three strategies and paired differences against the chosen reference, grouped by window. */
export function StrategyTable({ pkg, input, reference, groups = DEFAULT_GROUPS }: { pkg: FieldShiftPackage; input: PublishedComparison; reference: StrategyId; groups?: GroupId[] }) {
  const { t } = useI18n(); const names = useStrategyNames(); const label = useMetricLabel();
  const view = buildComparison(input, reference); const row = (k: MetricId) => view.rows.find((r) => r.metric === k)!;
  const x = pkg.summary; const n = input.scenarios[reference].valid_years; const mean = input.scenarios[reference].mean;
  // Withheld (null) when the daily columns do not reproduce the summary of the package; the published rows are not affected.
  const derived = useMemo(() => { try { return { view: buildExposure(pkg, input, reference), reason: null }; } catch (error) { return { view: null, reason: (error instanceof Error ? error.message : String(error)).split(':')[0] }; } }, [pkg, input, reference]);
  const exposure = derived.view;
  const unit = (k: MetricId) => (k.endsWith('_mm') ? 'mm' : t('common.days'));
  const cell = (k: MetricId, s: StrategyId) => { const r = row(k); return r.status[s] === 'ok' ? nMax(r.values[s], 1) : <span className="meta-13">{t(r.status[s] === 'not_grown' ? 'fieldShift.v2.table.notGrown' : 'fieldShift.v2.table.notSimulated')}</span>; };
  return (
    <>
      <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}>
        <table data-testid="fs-strategy-table" data-reference={reference} data-groups={groups.join(',')}>
          <thead><tr><th>{t('fieldShift.table.indicator')}</th>{STRATEGIES.map((s) => <th key={s} className="num" data-reference={s === reference || undefined}>{names.full(s)}</th>)}
            {view.others.map((s) => <th key={s} className="num">{t('fieldShift.v2.table.delta', { s: names.letter(s), ref: names.letter(reference) })}</th>)}</tr></thead>
          {groups.map((g) => <tbody key={g} data-group={g}>
            <tr><th colSpan={4 + view.others.length} scope="colgroup" className="meta-13">{t(`fieldShift.v2.group.${g}` as MessageKey)}</th></tr>
            {GROUPS[g].map((k) => <tr key={k} data-metric={k}><td>{label(k)} <span className="meta-13">({unit(k)})</span></td>
              {STRATEGIES.map((s) => <td key={s} className="num" data-strategy={s}>{cell(k, s)}</td>)}
              {view.others.map((s) => <td key={s} className="num" data-delta={s}><Delta stat={row(k).deltas[s]} /></td>)}</tr>)}
            {g === 'cover' && EXPOSURE_METRICS.map((k) => { const r = exposure?.rows.find((e) => e.metric === k); return <tr key={k} data-metric={k} data-derived data-reason={derived.reason ?? undefined}>
              <td>{t(`fieldShift.v2.metric.${k}` as MessageKey)} <span className="meta-13">({k.endsWith('_mm') ? 'mm' : t('common.days')})</span><span className="meta-13 block">{t('fieldShift.v2.exposure.derived')}</span></td>
              {r ? <>{STRATEGIES.map((s) => <td key={s} className="num" data-strategy={s}>{nMax(r.values[s], 1)}</td>)}{view.others.map((s) => <td key={s} className="num" data-delta={s}><Delta stat={r.deltas[s]} /></td>)}</>
                : <td colSpan={3 + view.others.length} className="meta-13">{t('fieldShift.v2.exposure.unavailable')}</td>}</tr>; })}
          </tbody>)}
          <tbody><tr><td>{t('fieldShift.table.yieldEffect')}</td><td className="num" colSpan={3 + view.others.length}>{t('fieldShift.table.notEvaluated')}</td></tr></tbody>
        </table>
      </div>
      <p className="meta-13">{t('fieldShift.v2.table.context', { rain: nMax(mean.year_rain_mm, 0), days: nMax(mean.year_days, 0) })} {t('fieldShift.v2.table.paired')}</p>
      <p className="meta-13">{t('fieldShift.v2.notes.covered')} {t('fieldShift.v2.notes.drainage')}</p>
      {exposure && <p className="meta-13" data-testid="fs-exposure-note">{t('fieldShift.v2.notes.exposure', { share: n0(exposure.wetShare * 100), n })}{exposure.multiplier !== 1 && ` ${t('fieldShift.v2.notes.exposureRain', { factor: nMax(exposure.multiplier, 1) })}`}</p>}
      <p className="meta">{t('fieldShift.v2.notSimulated', { list: x.not_simulated.map((k) => { const key = k.split(' ').join('_'); return NOT_KEYS.includes(key) ? t(`fieldShift.v2.not.${key}` as MessageKey) : k; }).join(', ') })}</p>
      <p className="meta-13" data-testid="fs-package" translate="no">{t('fieldShift.v2.package', { id: pkg.id, source: x.weather.source })} · n = {n}</p>
    </>
  );
}

/** Daily soil water of the three strategies in one agricultural year (historical weather, unchanged). */
export function StrategyChart({ pkg, year }: { pkg: FieldShiftPackage; year: string }) {
  const { t } = useI18n();
  const A = pkg.series.scenarios.reference_fallow, B = pkg.series.scenarios.brachiaria, C = pkg.series.scenarios.soy_long_fallow;
  const a = A.agricultural_year.indexOf(year), b = A.agricultural_year.lastIndexOf(year) + 1;
  if (a < 0) return null;
  return <PhaseTimeline series={{ dates: A.date.slice(a, b), rain: A.rain_mm.slice(a, b), storage: A.storage_end_mm.slice(a, b), storageB: B.storage_end_mm.slice(a, b), storageC: C.storage_end_mm.slice(a, b),
    stage: A.stage.slice(a, b), land: A.land_cover.slice(a, b), landB: B.land_cover.slice(a, b), landC: C.land_cover.slice(a, b), deficit: A.et_deficit_mm.slice(a, b), capacity: pkg.series.capacity_mm }}
    labelA={t('fieldShift.daily.labelA')} labelB={t('fieldShift.daily.labelB')} labelC={t('fieldShift.v2.daily.labelC')} ariaLabel={t('fieldShift.v2.daily.chart', { year })} height={240} />;
}

/** The rain point on screen: one of the calculated points of the package; anything else is the historical one. */
export function rainPoint(pkg: FieldShiftPackage, percent: string | null): RainPoint {
  const points = pkg.summary.sensitivity.rain.points; const base = points.find((p) => p.multiplier === 1)!;
  return points.find((p) => String(p.rain_change_percent) === percent) ?? base;
}
/** Sensitivity to rain: discrete calculated points only (a slider would suggest results between them). Not a forecast. */
export function RainControl({ pkg, point, onChange }: { pkg: FieldShiftPackage; point: RainPoint; onChange: (percent: string) => void }) {
  const { t } = useI18n(); const rain = pkg.summary.sensitivity.rain;
  const label = (p: RainPoint) => (p.rain_change_percent < 0 ? t('fieldShift.v2.rain.minus') : p.rain_change_percent > 0 ? t('fieldShift.v2.rain.plus') : t('fieldShift.v2.rain.base'));
  return (
    <section className="card" data-testid="fs-rain" data-multiplier={point.multiplier}>
      <Seg legend={t('fieldShift.v2.rain.legend')} name="chuva" value={String(point.rain_change_percent)} onChange={onChange} options={rain.points.map((p) => ({ value: String(p.rain_change_percent), label: label(p) }))} />
      <p className="meta-13"><b>{t('fieldShift.v2.rain.label')}</b>{point.multiplier !== 1 && <> {t('fieldShift.v2.rain.active', { change: label(point), rain: nMax(point.scenarios.reference_fallow.mean.year_rain_mm, 0) })} {t('fieldShift.v2.rain.method', { factor: nMax(point.multiplier, 1) })}</>}</p>
      <p className="meta-13">{t('fieldShift.v2.rain.temperature')}</p>
    </section>
  );
}
