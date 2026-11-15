// Field Shift — bare soil and vulnerable seasons (historical simulation, extension checked against the v2 package).
// Rain on bare soil is an exposure proxy, not erosion; the ±20% rows are a sensitivity test, not a climate projection.
import { simulations, type FieldShiftPackage } from '../adapters';
import { nMax, signed } from '../format';
import { useI18n, type MessageKey } from '../i18n';
import { Loading, Notice, Pill, useAsync } from '../ui';
import { STRATEGIES, type PairStat } from '../sim/field-shift-decision';
import { BARE_METRICS, bareSoilView, type BareMetric } from '../sim/field-shift-bare-soil';
import { useStrategyNames } from './FieldShiftStrategies';

const ALTS = ['brachiaria', 'soy_long_fallow'] as const;
const unitOf = (k: BareMetric) => (k.endsWith('_mm') ? 'mm' : 'days');
export function BareSoilCard({ pkg, highlight }: { pkg: FieldShiftPackage; highlight: boolean }) {
  const { t } = useI18n(); const names = useStrategyNames();
  const ext = useAsync((s) => simulations.fieldShiftBareSoil(pkg.summary.municipality_code, pkg.summary, s), [pkg.id]);
  const unit = (k: BareMetric) => (unitOf(k) === 'mm' ? 'mm' : t('common.days'));
  const value = (v: number | null) => (v == null ? '—' : nMax(v, 1));
  const delta = (v: number | null) => (v == null ? '—' : signed(Math.abs(v) < 0.05 ? 0 : v, 1));
  const label = (k: BareMetric) => <>{t(`fieldShift.v2.bare.metric.${k}` as MessageKey)} <span className="meta-13">({unit(k)})</span>{k === 'rain_on_bare_soil_mm' && <span className="meta-13 block">{t('fieldShift.v2.bare.proxy')}</span>}</>;
  const range = (d: PairStat) => { const min = delta(d.min), max = delta(d.max); return min !== max && <span className="meta-13 block">{t('fieldShift.v2.table.range', { min, max })}</span>; };
  if (ext.status === 'error') return <section className="card" data-testid="fs-bare" data-status="refused"><h2>{t('fieldShift.v2.bare.title')}</h2><Notice tone="warn" title={t('fieldShift.v2.bare.mismatch.title')}>{t('fieldShift.v2.bare.mismatch.text')}</Notice></section>;
  if (!ext.data) return <section className="card" data-testid="fs-bare"><h2>{t('fieldShift.v2.bare.title')}</h2><Loading rows={3} /></section>;
  const view = bareSoilView(ext.data.data); const row = (k: BareMetric) => view.rows.find((r) => r.metric === k)!;
  return (
    <section className="card" data-testid="fs-bare" data-highlight={highlight || undefined} id="fs-bare">
      <div className="row-between"><h2>{t('fieldShift.v2.bare.title')}</h2><Pill tone="warn">{t('fieldShift.v2.bare.kind')}</Pill></div>
      <p className="meta">{t('fieldShift.v2.bare.intro', { n: pkg.summary.scenarios.reference_fallow.valid_years })}{highlight ? ` ${t('fieldShift.v2.bare.highlight')}` : ''}</p>
      <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}>
        <table data-testid="fs-bare-table"><thead><tr><th>{t('fieldShift.table.indicator')}</th>{STRATEGIES.map((s) => <th key={s} className="num">{names.full(s)}</th>)}{ALTS.map((s) => <th key={s} className="num">{t('fieldShift.v2.table.delta', { s: names.letter(s), ref: 'A' })}</th>)}</tr></thead>
          <tbody>{BARE_METRICS.map((k) => <tr key={k} data-metric={k}><td>{label(k)}</td>{STRATEGIES.map((s) => <td key={s} className="num" data-strategy={s}>{value(row(k).values[s])}</td>)}{ALTS.map((s) => { const d = row(k).deltas[s]; return <td key={s} className="num" data-delta={s}><b>{delta(d.mean)}</b>{d.mean != null && range(d)}</td>; })}</tr>)}</tbody></table>
      </div>
      <h3 className="meta">{t('fieldShift.v2.bare.sens.title')}</h3>
      <p className="meta-13"><b>{t('fieldShift.v2.bare.sens.label')}</b> {t('fieldShift.v2.bare.sens.method')}</p>
      <div className="table-wrap" tabIndex={0} role="group" aria-label={t('common.tableScroll')}>
        <table data-testid="fs-bare-sens"><thead><tr><th>{t('fieldShift.v2.bare.sens.rain')}</th><th>{t('fieldShift.v2.bare.sens.comparison')}</th>{BARE_METRICS.slice(1).map((k) => <th key={k} className="num">{t(`fieldShift.v2.bare.metric.${k}` as MessageKey)} ({unit(k)})</th>)}</tr></thead>
          <tbody>{view.sensitivity.map((r) => <tr key={`${r.percent}${r.alt}`} data-highlight data-percent={r.percent} data-alt={r.alt}><td>{t(r.percent < 0 ? 'fieldShift.v2.rain.minus' : 'fieldShift.v2.rain.plus')}</td><td>{t('fieldShift.v2.table.delta', { s: names.letter(r.alt), ref: 'A' })}</td>{BARE_METRICS.slice(1).map((k) => <td key={k} className="num">{delta(r.values[k])}</td>)}</tr>)}
            <tr data-parameter="temperature"><td colSpan={2 + BARE_METRICS.length - 1}>{t('fieldShift.v2.bare.sens.temperature')}</td></tr></tbody></table>
      </div>
      <p className="meta-13" translate="no">{t('fieldShift.v2.bare.source', { script: ext.data.data.provenance.script, id: pkg.id })}</p>
    </section>
  );
}
